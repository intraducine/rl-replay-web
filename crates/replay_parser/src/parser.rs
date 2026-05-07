use crate::normalize::{identity_quat, now_ms, quat, vec3, vec3i};
use crate::types::*;
use boxcars::{Attribute, ParserBuilder, Replay};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use wasm_bindgen::prelude::*;

const PARSER_VERSION: &str = "boxcars-0.11.1";

pub fn parse_replay_metadata(
    bytes: &[u8],
    file_name: Option<String>,
) -> Result<ReplayMetadata, JsValue> {
    let replay = ParserBuilder::new(bytes)
        .never_parse_network_data()
        .on_error_check_crc()
        .parse()
        .map_err(parse_error)?;

    Ok(metadata_from_replay(&replay, file_name))
}

pub fn parse_replay_timeline(
    bytes: &[u8],
    file_name: Option<String>,
) -> Result<ReplayTimeline, JsValue> {
    let replay = ParserBuilder::new(bytes)
        .must_parse_network_data()
        .on_error_check_crc()
        .parse()
        .map_err(parse_error)?;
    let mut metadata = metadata_from_replay(&replay, file_name);
    let network_insights = extract_network_insights(&replay, &metadata);
    merge_network_metadata(&mut metadata, network_insights.metadata);
    merge_player_insights(&mut metadata.players, network_insights.players);
    let frames = extract_timeline_frames(&replay, &metadata);
    let clock = extract_clock_samples(&replay);
    metadata.match_length_seconds = match_length_seconds_from_clock(&clock);
    let mut events = goal_events(&replay);
    events.extend(highlight_events(&replay));
    events.extend(network_insights.events);
    events.sort_by(|a, b| event_time(a).total_cmp(&event_time(b)));

    Ok(ReplayTimeline {
        version: 1,
        metadata,
        frames,
        events,
        clock,
    })
}

pub fn metadata_from_replay(replay: &Replay, file_name: Option<String>) -> ReplayMetadata {
    let properties = property_map(replay);
    let file_name = file_name.unwrap_or_else(|| "local.replay".to_string());
    let replay_name =
        string_prop(&properties, "ReplayName").or_else(|| string_prop(&properties, "Id"));
    let map_name = string_prop(&properties, "MapName").or_else(|| replay.levels.first().cloned());
    let duration_seconds = float_prop(&properties, "RecordFPS")
        .and_then(|fps| {
            int_prop(&properties, "NumFrames").map(|frames| frames as f32 / fps.max(1.0))
        })
        .or_else(|| float_prop(&properties, "ReplayTime"))
        .unwrap_or_else(|| {
            replay
                .network_frames
                .as_ref()
                .and_then(|n| n.frames.last().map(|f| f.time))
                .unwrap_or(0.0)
        });
    let players = players_from_properties(&properties);
    let teams = vec![
        ReplayTeam {
            id: 0,
            name: "Blue".into(),
            score: int_prop(&properties, "Team0Score").unwrap_or(0),
        },
        ReplayTeam {
            id: 1,
            name: "Orange".into(),
            score: int_prop(&properties, "Team1Score").unwrap_or(0),
        },
    ];

    ReplayMetadata {
        id: stable_id(&file_name, replay_name.as_deref(), duration_seconds),
        file_name,
        replay_name,
        map_name,
        date: string_prop(&properties, "Date"),
        duration_seconds,
        match_length_seconds: None,
        total_seconds_played: float_prop(&properties, "TotalSecondsPlayed"),
        forfeit: bool_prop(&properties, "bForfeit"),
        match_guid: string_prop(&properties, "MatchGUID"),
        match_type: string_prop(&properties, "MatchType"),
        team_size: int_prop(&properties, "TeamSize"),
        unfair_team_size: int_prop(&properties, "UnfairTeamSize"),
        playlist: None,
        server_region: None,
        game_server_id: None,
        build_version: string_prop(&properties, "BuildVersion"),
        build_id: int_prop(&properties, "BuildID"),
        changelist: int_prop(&properties, "Changelist"),
        game_version: int_prop(&properties, "GameVersion"),
        replay_version: int_prop(&properties, "ReplayVersion"),
        replay_last_save_version: int_prop(&properties, "ReplayLastSaveVersion"),
        created_at: now_ms(),
        parser_version: PARSER_VERSION.into(),
        players,
        teams,
        source: "wasm".into(),
    }
}

fn extract_timeline_frames(replay: &Replay, metadata: &ReplayMetadata) -> Vec<TimelineFrame> {
    let Some(network) = &replay.network_frames else {
        return Vec::new();
    };

    let properties = property_map(replay);
    let fps = float_prop(&properties, "RecordFPS")
        .unwrap_or(30.0)
        .max(1.0);
    let mut actors: HashMap<i32, ActorState> = HashMap::new();
    let mut player_car: HashMap<i32, String> = HashMap::new();
    let mut pri_to_player: HashMap<i32, String> = HashMap::new();
    let mut boost_component_vehicle: HashMap<i32, i32> = HashMap::new();
    let mut frames = Vec::with_capacity(network.frames.len().min(6000));
    for (frame_index, frame) in network.frames.iter().enumerate() {
        for actor in &frame.new_actors {
            let object_name = object_name(replay, actor.object_id.0).unwrap_or_default();
            let state = ActorState {
                object_name: object_name.clone(),
                kind: classify_actor(&object_name),
                rigid_body: actor
                    .initial_trajectory
                    .location
                    .map(|location| RigidBodyFrame {
                        position: vec3i(location),
                        rotation: identity_quat(),
                        velocity: None,
                        angular_velocity: None,
                    }),
                boost: None,
                boost_active: None,
                alive: true,
            };
            actors.insert(actor.actor_id.0, state);
        }

        for deleted in &frame.deleted_actors {
            if let Some(actor) = actors.get_mut(&deleted.0) {
                actor.alive = false;
            }
        }

        for updated in &frame.updated_actors {
            let object = object_name(replay, updated.object_id.0).unwrap_or_default();
            let entry = actors
                .entry(updated.actor_id.0)
                .or_insert_with(|| ActorState {
                    object_name: object.clone(),
                    kind: classify_actor(&object),
                    rigid_body: None,
                    boost: None,
                    boost_active: None,
                    alive: true,
                });

            if entry.kind == SemanticActorKind::Unknown {
                entry.kind = classify_actor(&entry.object_name);
            }

            let is_boost_component_active_attr = object == "TAGame.CarComponent_TA:ReplicatedActive"
                && entry
                    .object_name
                    .to_ascii_lowercase()
                    .contains("carcomponent_boost");

            match &updated.attribute {
                Attribute::RigidBody(body) => {
                    entry.rigid_body = Some(RigidBodyFrame {
                        position: vec3(body.location),
                        rotation: quat(body.rotation),
                        velocity: body.linear_velocity.map(vec3),
                        angular_velocity: body.angular_velocity.map(vec3),
                    });
                }
                Attribute::ReplicatedBoost(boost) => {
                    let amount = (boost.boost_amount as f32 / 255.0) * 100.0;
                    entry.boost = Some(amount);
                    if let Some(vehicle_id) =
                        boost_component_vehicle.get(&updated.actor_id.0).copied()
                    {
                        if let Some(vehicle) = actors.get_mut(&vehicle_id) {
                            vehicle.boost = Some(amount);
                        }
                    }
                }
                Attribute::Byte(activity) if is_boost_component_active_attr => {
                    let active = activity % 2 == 1;
                    entry.boost_active = Some(active);
                    if let Some(vehicle_id) =
                        boost_component_vehicle.get(&updated.actor_id.0).copied()
                    {
                        if let Some(vehicle) = actors.get_mut(&vehicle_id) {
                            vehicle.boost_active = Some(active);
                        }
                    }
                }
                Attribute::Boolean(active) if is_boost_component_active_attr => {
                    entry.boost_active = Some(*active);
                    if let Some(vehicle_id) =
                        boost_component_vehicle.get(&updated.actor_id.0).copied()
                    {
                        if let Some(vehicle) = actors.get_mut(&vehicle_id) {
                            vehicle.boost_active = Some(*active);
                        }
                    }
                }
                Attribute::String(player_name)
                    if object.to_ascii_lowercase().contains("playername") =>
                {
                    if let Some(player) = metadata
                        .players
                        .iter()
                        .find(|player| player.name == *player_name)
                    {
                        pri_to_player.insert(updated.actor_id.0, player.id.clone());
                    }
                }
                Attribute::ActiveActor(active) if active.active => {
                    let lowered = object.to_ascii_lowercase();
                    if lowered.contains("playerreplicationinfo") {
                        if let Some(player_id) = pri_to_player.get(&active.actor.0) {
                            player_car.insert(updated.actor_id.0, player_id.clone());
                        }
                    } else if lowered.contains("carcomponent_ta:vehicle") {
                        let boost = entry.boost;
                        let boost_active = entry.boost_active;
                        boost_component_vehicle.insert(updated.actor_id.0, active.actor.0);
                        if let Some(boost) = boost {
                            if let Some(vehicle) = actors.get_mut(&active.actor.0) {
                                vehicle.boost = Some(boost);
                            }
                        }
                        if let Some(boost_active) = boost_active {
                            if let Some(vehicle) = actors.get_mut(&active.actor.0) {
                                vehicle.boost_active = Some(boost_active);
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        let mut ball = None;
        let mut cars = BTreeMap::new();
        for (actor_id, actor) in &actors {
            if !actor.alive {
                continue;
            }
            match actor.kind {
                SemanticActorKind::Ball => {
                    ball = actor.rigid_body.clone();
                }
                SemanticActorKind::Car => {
                    if let Some(body) = &actor.rigid_body {
                        let player_id = player_car
                            .get(actor_id)
                            .cloned()
                            .unwrap_or_else(|| format!("actor-{actor_id}"));
                        let car_key = if cars.contains_key(&player_id) {
                            format!("actor-{actor_id}")
                        } else {
                            player_id
                        };
                        cars.insert(
                            car_key,
                            CarFrame {
                                position: body.position,
                                rotation: body.rotation,
                                velocity: body.velocity,
                                angular_velocity: body.angular_velocity,
                                boost: actor.boost,
                                boost_active: actor.boost_active,
                                demolished: None,
                                supersonic: None,
                            },
                        );
                    }
                }
                _ => {}
            }
        }

        if ball.is_some() || !cars.is_empty() {
            frames.push(TimelineFrame {
                t: frame_index as f32 / fps,
                ball,
                cars,
            });
        }
    }

    frames
}

pub fn property_map(replay: &Replay) -> BTreeMap<String, serde_json::Value> {
    replay
        .properties
        .iter()
        .filter_map(|(key, value)| {
            serde_json::to_value(value)
                .ok()
                .map(|json| (key.clone(), json))
        })
        .collect()
}

fn players_from_properties(properties: &BTreeMap<String, serde_json::Value>) -> Vec<ReplayPlayer> {
    let mut players = Vec::new();
    if let Some(stats) = properties
        .get("PlayerStats")
        .and_then(|value| value.as_array())
    {
        for (index, row) in stats.iter().enumerate() {
            let object = props_object(row);
            let name = object
                .and_then(|obj| obj.get("Name").or_else(|| obj.get("PlayerName")))
                .and_then(|value| value.as_str())
                .unwrap_or("Player");
            let team = object
                .and_then(|obj| obj.get("Team").or_else(|| obj.get("TeamNum")))
                .and_then(|value| value.as_i64())
                .unwrap_or((index % 2) as i64) as u8;
            players.push(ReplayPlayer {
                id: format!("player-{index}-{name}"),
                name: name.to_string(),
                team: if team == 1 { 1 } else { 0 },
                car_actor_id: None,
                platform_id: object
                    .and_then(|obj| obj.get("OnlineID"))
                    .and_then(|value| {
                        value
                            .as_str()
                            .map(ToString::to_string)
                            .or_else(|| value.as_u64().map(|id| id.to_string()))
                    }),
                platform: object
                    .and_then(|obj| obj.get("Platform"))
                    .and_then(platform_value)
                    .map(ToString::to_string),
                stats: Some(ReplayPlayerStats {
                    score: object.and_then(|obj| json_int(obj, "Score")).unwrap_or(0),
                    goals: object.and_then(|obj| json_int(obj, "Goals")).unwrap_or(0),
                    assists: object.and_then(|obj| json_int(obj, "Assists")).unwrap_or(0),
                    saves: object.and_then(|obj| json_int(obj, "Saves")).unwrap_or(0),
                    shots: object.and_then(|obj| json_int(obj, "Shots")).unwrap_or(0),
                    demos: None,
                }),
                cosmetics: None,
                ping: None,
                title: None,
                club_id: None,
            });
        }
    }

    players
}

fn goal_events(replay: &Replay) -> Vec<ReplayEvent> {
    let properties = property_map(replay);
    let fps = float_prop(&properties, "RecordFPS")
        .unwrap_or(30.0)
        .max(1.0);
    properties
        .get("Goals")
        .and_then(|value| value.as_array())
        .into_iter()
        .flatten()
        .enumerate()
        .map(|(index, goal)| {
            let object = props_object(goal);
            let t = object
                .and_then(|obj| obj.get("frame").or_else(|| obj.get("Frame")))
                .and_then(|value| value.as_f64())
                .map(|frame| frame as f32 / fps)
                .unwrap_or(index as f32);
            let team = object
                .and_then(|obj| obj.get("PlayerTeam"))
                .and_then(|value| value.as_u64())
                .unwrap_or(0) as u8;
            let scorer_id = object
                .and_then(|obj| obj.get("PlayerName"))
                .and_then(|value| value.as_str())
                .map(|name| stable_player_id_for_name(&properties, name));
            ReplayEvent::Goal {
                t,
                scorer_id,
                team,
                label: Some("Goal".into()),
            }
        })
        .collect()
}

fn highlight_events(replay: &Replay) -> Vec<ReplayEvent> {
    let properties = property_map(replay);
    let fps = float_prop(&properties, "RecordFPS")
        .unwrap_or(30.0)
        .max(1.0);

    properties
        .get("HighLights")
        .and_then(|value| value.as_array())
        .into_iter()
        .flatten()
        .filter_map(|highlight| {
            let object = props_object(highlight)?;
            let goal_actor = object
                .get("GoalActorName")
                .and_then(|value| value.as_str())
                .unwrap_or("None");
            if goal_actor != "None" {
                return None;
            }
            let t = object
                .get("frame")
                .or_else(|| object.get("Frame"))
                .and_then(|value| value.as_f64())
                .map(|frame| frame as f32 / fps)?;
            Some(ReplayEvent::Shot {
                t,
                player_id: None,
                label: Some("Highlight".into()),
            })
        })
        .collect()
}

fn extract_clock_samples(replay: &Replay) -> Vec<ReplayClockSample> {
    let Some(network) = &replay.network_frames else {
        return Vec::new();
    };

    let properties = property_map(replay);
    let fps = float_prop(&properties, "RecordFPS")
        .unwrap_or(30.0)
        .max(1.0);
    let mut current = ReplayClockSample::default();
    let mut samples = Vec::new();

    for (frame_index, frame) in network.frames.iter().enumerate() {
        let mut changed = false;
        let t = frame_index as f32 / fps;

        for updated in &frame.updated_actors {
            let attribute = object_name(replay, updated.object_id.0).unwrap_or_default();
            match (attribute.as_str(), &updated.attribute) {
                ("TAGame.GameEvent_Soccar_TA:SecondsRemaining", Attribute::Int(value)) => {
                    current.seconds_remaining = Some(*value);
                    changed = true;
                }
                ("TAGame.GameEvent_TA:ReplicatedGameStateTimeRemaining", Attribute::Int(value)) => {
                    current.state_time_remaining = Some(*value);
                    changed = true;
                }
                ("TAGame.GameEvent_Soccar_TA:GameTime", Attribute::Int(value)) => {
                    current.game_time_seconds = Some(*value);
                    changed = true;
                }
                ("TAGame.GameEvent_Soccar_TA:bOverTime", Attribute::Boolean(value)) => {
                    current.overtime = Some(*value);
                    changed = true;
                }
                ("TAGame.GameEvent_Soccar_TA:bBallHasBeenHit", Attribute::Boolean(value)) => {
                    current.ball_has_been_hit = Some(*value);
                    changed = true;
                }
                _ => {}
            }
        }

        if changed {
            let mut sample = current.clone();
            sample.t = t;
            if samples
                .last()
                .map(|previous: &ReplayClockSample| {
                    previous.seconds_remaining == sample.seconds_remaining
                        && previous.state_time_remaining == sample.state_time_remaining
                        && previous.game_time_seconds == sample.game_time_seconds
                        && previous.overtime == sample.overtime
                        && previous.ball_has_been_hit == sample.ball_has_been_hit
                })
                .unwrap_or(false)
            {
                continue;
            }
            samples.push(sample);
        }
    }

    samples
}

#[derive(Default)]
struct NetworkInsights {
    metadata: NetworkMetadata,
    players: HashMap<String, ReplayPlayer>,
    events: Vec<ReplayEvent>,
}

#[derive(Default)]
struct NetworkMetadata {
    playlist: Option<i32>,
    server_region: Option<String>,
    game_server_id: Option<String>,
}

fn extract_network_insights(replay: &Replay, metadata: &ReplayMetadata) -> NetworkInsights {
    let Some(network) = &replay.network_frames else {
        return NetworkInsights::default();
    };

    let properties = property_map(replay);
    let fps = float_prop(&properties, "RecordFPS")
        .unwrap_or(30.0)
        .max(1.0);
    let mut actors: HashMap<i32, String> = HashMap::new();
    let mut pri_to_player: HashMap<i32, String> = HashMap::new();
    let mut player_car: HashMap<i32, String> = HashMap::new();
    let mut car_team_paint: HashMap<i32, ReplayTeamPaint> = HashMap::new();
    let mut insights = NetworkInsights::default();

    for (frame_index, frame) in network.frames.iter().enumerate() {
        let t = frame_index as f32 / fps;

        for actor in &frame.new_actors {
            actors.insert(
                actor.actor_id.0,
                object_name(replay, actor.object_id.0).unwrap_or_default(),
            );
        }

        for updated in &frame.updated_actors {
            let attribute = object_name(replay, updated.object_id.0).unwrap_or_default();
            match (attribute.as_str(), &updated.attribute) {
                ("Engine.PlayerReplicationInfo:PlayerName", Attribute::String(name))
                | ("TAGame.PRI_TA:PlayerName", Attribute::String(name)) => {
                    if let Some(player) =
                        metadata.players.iter().find(|player| player.name == *name)
                    {
                        pri_to_player.insert(updated.actor_id.0, player.id.clone());
                    }
                }
                ("Engine.PlayerReplicationInfo:Ping", Attribute::Byte(ping)) => {
                    update_player(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |player| {
                            player.ping = Some(*ping as i32);
                        },
                    );
                }
                ("TAGame.PRI_TA:MatchScore", Attribute::Int(value)) => {
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.score = *value,
                    );
                }
                ("TAGame.PRI_TA:MatchGoals", Attribute::Int(value)) => {
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.goals = *value,
                    );
                }
                ("TAGame.PRI_TA:MatchAssists", Attribute::Int(value)) => {
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.assists = *value,
                    );
                }
                ("TAGame.PRI_TA:MatchSaves", Attribute::Int(value)) => {
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.saves = *value,
                    );
                }
                ("TAGame.PRI_TA:MatchShots", Attribute::Int(value)) => {
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.shots = *value,
                    );
                }
                ("TAGame.PRI_TA:MatchDemolishes", Attribute::Int(value)) => {
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.demos = Some(*value),
                    );
                }
                ("TAGame.PRI_TA:Title", Attribute::Int(value)) => {
                    update_player(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |player| {
                            player.title = Some(value.to_string());
                        },
                    );
                }
                ("TAGame.PRI_TA:ClubID", Attribute::Int64(value)) => {
                    update_player(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |player| {
                            player.club_id = Some(value.to_string());
                        },
                    );
                }
                ("TAGame.PRI_TA:ClientLoadout", Attribute::Loadout(loadout)) => {
                    update_player_cosmetics(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |cosmetics| {
                            cosmetics.loadout = Some(loadout_from_boxcars(loadout));
                        },
                    );
                }
                ("TAGame.GameEvent_Soccar_TA:ReplicatedStatEvent", Attribute::StatEvent(stat)) => {
                    if let Some(event) = stat_event(replay, t, stat.object_id) {
                        insights.events.push(event);
                    }
                }
                ("TAGame.Car_TA:ReplicatedDemolishExtended", Attribute::DemolishExtended(demo)) => {
                    let attacker_id = player_car.get(&demo.attacker.actor.0).cloned();
                    let victim_id = player_car.get(&demo.victim.actor.0).cloned();
                    insights.events.push(ReplayEvent::Demo {
                        t,
                        attacker_id,
                        victim_id,
                        label: Some(
                            if demo.self_demolish {
                                "Self demo"
                            } else {
                                "Demo"
                            }
                            .into(),
                        ),
                    });
                }
                ("TAGame.Car_TA:TeamPaint", Attribute::TeamPaint(paint)) => {
                    let paint = ReplayTeamPaint {
                        team: paint.team,
                        primary_color: paint.primary_color,
                        accent_color: paint.accent_color,
                        primary_finish: Some(paint.primary_finish),
                        accent_finish: Some(paint.accent_finish),
                    };
                    car_team_paint.insert(updated.actor_id.0, paint.clone());
                    if let Some(player_id) = player_car.get(&updated.actor_id.0).cloned() {
                        update_player_cosmetics_by_id(
                            &mut insights.players,
                            player_id,
                            |cosmetics| {
                                cosmetics.team_paint = Some(paint);
                            },
                        );
                    }
                }
                ("TAGame.GameEvent_TA:ReplicatedGameStateTimeRemaining", Attribute::Int(_)) => {}
                ("ProjectX.GRI_X:ReplicatedGamePlaylist", Attribute::Int(value)) => {
                    insights.metadata.playlist = Some(*value);
                }
                ("ProjectX.GRI_X:ReplicatedServerRegion", Attribute::String(value)) => {
                    insights.metadata.server_region = Some(value.clone());
                }
                ("ProjectX.GRI_X:GameServerID", Attribute::QWord(value)) => {
                    insights.metadata.game_server_id = Some(value.to_string());
                }
                (name, Attribute::ActiveActor(active)) if active.active => {
                    let lowered = name.to_ascii_lowercase();
                    if lowered.contains("playerreplicationinfo") {
                        if let Some(player_id) = pri_to_player.get(&active.actor.0).cloned() {
                            player_car.insert(updated.actor_id.0, player_id.clone());
                            if let Some(paint) = car_team_paint.get(&updated.actor_id.0).cloned() {
                                update_player_cosmetics_by_id(
                                    &mut insights.players,
                                    player_id,
                                    |cosmetics| {
                                        cosmetics.team_paint = Some(paint);
                                    },
                                );
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    insights
}

fn match_length_seconds_from_clock(clock: &[ReplayClockSample]) -> Option<i32> {
    clock
        .iter()
        .filter_map(|sample| sample.game_time_seconds)
        .find(|seconds| *seconds > 0)
        .or_else(|| {
            clock
                .iter()
                .filter_map(|sample| sample.seconds_remaining)
                .filter(|seconds| *seconds > 0)
                .max()
        })
}

fn merge_network_metadata(metadata: &mut ReplayMetadata, network: NetworkMetadata) {
    if network.playlist.is_some() {
        metadata.playlist = network.playlist;
    }
    if network.server_region.is_some() {
        metadata.server_region = network.server_region;
    }
    if network.game_server_id.is_some() {
        metadata.game_server_id = network.game_server_id;
    }
}

fn merge_player_insights(players: &mut [ReplayPlayer], insights: HashMap<String, ReplayPlayer>) {
    for player in players {
        let Some(insight) = insights.get(&player.id) else {
            continue;
        };
        if insight.ping.is_some() {
            player.ping = insight.ping;
        }
        if insight.title.is_some() {
            player.title = insight.title.clone();
        }
        if insight.club_id.is_some() {
            player.club_id = insight.club_id.clone();
        }
        if insight.cosmetics.is_some() {
            player.cosmetics = insight.cosmetics.clone();
        }
        if let Some(next_stats) = &insight.stats {
            if let Some(stats) = &mut player.stats {
                stats.score = next_stats.score.max(stats.score);
                stats.goals = next_stats.goals.max(stats.goals);
                stats.assists = next_stats.assists.max(stats.assists);
                stats.saves = next_stats.saves.max(stats.saves);
                stats.shots = next_stats.shots.max(stats.shots);
                stats.demos = next_stats.demos.or(stats.demos);
            } else {
                player.stats = Some(next_stats.clone());
            }
        }
    }
}

fn update_player<F>(
    players: &mut HashMap<String, ReplayPlayer>,
    pri_to_player: &HashMap<i32, String>,
    pri_actor_id: i32,
    update: F,
) where
    F: FnOnce(&mut ReplayPlayer),
{
    if let Some(player_id) = pri_to_player.get(&pri_actor_id) {
        update_player_by_id(players, player_id.clone(), update);
    }
}

fn update_player_stats<F>(
    players: &mut HashMap<String, ReplayPlayer>,
    pri_to_player: &HashMap<i32, String>,
    pri_actor_id: i32,
    update: F,
) where
    F: FnOnce(&mut ReplayPlayerStats),
{
    update_player(players, pri_to_player, pri_actor_id, |player| {
        let stats = player.stats.get_or_insert(ReplayPlayerStats {
            score: 0,
            goals: 0,
            assists: 0,
            saves: 0,
            shots: 0,
            demos: None,
        });
        update(stats);
    });
}

fn update_player_cosmetics<F>(
    players: &mut HashMap<String, ReplayPlayer>,
    pri_to_player: &HashMap<i32, String>,
    pri_actor_id: i32,
    update: F,
) where
    F: FnOnce(&mut ReplayPlayerCosmetics),
{
    if let Some(player_id) = pri_to_player.get(&pri_actor_id).cloned() {
        update_player_cosmetics_by_id(players, player_id, update);
    }
}

fn update_player_cosmetics_by_id<F>(
    players: &mut HashMap<String, ReplayPlayer>,
    player_id: String,
    update: F,
) where
    F: FnOnce(&mut ReplayPlayerCosmetics),
{
    update_player_by_id(players, player_id, |player| {
        let cosmetics = player
            .cosmetics
            .get_or_insert_with(ReplayPlayerCosmetics::default);
        update(cosmetics);
    });
}

fn update_player_by_id<F>(players: &mut HashMap<String, ReplayPlayer>, player_id: String, update: F)
where
    F: FnOnce(&mut ReplayPlayer),
{
    let player = players.entry(player_id.clone()).or_insert(ReplayPlayer {
        id: player_id,
        name: String::new(),
        team: 0,
        car_actor_id: None,
        platform_id: None,
        platform: None,
        stats: None,
        cosmetics: None,
        ping: None,
        title: None,
        club_id: None,
    });
    update(player);
}

fn stat_event(replay: &Replay, t: f32, object_id: i32) -> Option<ReplayEvent> {
    let name = object_name(replay, object_id)?;
    let label = name.rsplit('.').next().unwrap_or(name.as_str()).to_string();
    let lowered = label.to_ascii_lowercase();
    if lowered.contains("save") {
        return Some(ReplayEvent::Save {
            t,
            player_id: None,
            label: Some(label),
        });
    }
    if lowered.contains("shot") {
        return Some(ReplayEvent::Shot {
            t,
            player_id: None,
            label: Some(label),
        });
    }
    None
}

fn loadout_from_boxcars(loadout: &boxcars::Loadout) -> ReplayLoadout {
    ReplayLoadout {
        body: Some(loadout.body),
        decal: Some(loadout.decal),
        wheels: Some(loadout.wheels),
        boost: Some(loadout.rocket_trail),
        antenna: Some(loadout.antenna),
        topper: Some(loadout.topper),
        engine_audio: loadout.engine_audio,
        trail: loadout.trail,
        goal_explosion: loadout.goal_explosion,
        banner: loadout.banner,
    }
}

fn event_time(event: &ReplayEvent) -> f32 {
    match event {
        ReplayEvent::Goal { t, .. }
        | ReplayEvent::Demo { t, .. }
        | ReplayEvent::Shot { t, .. }
        | ReplayEvent::Save { t, .. } => *t,
    }
}

fn stable_player_id_for_name(
    properties: &BTreeMap<String, serde_json::Value>,
    name: &str,
) -> String {
    players_from_properties(properties)
        .into_iter()
        .find(|player| player.name == name)
        .map(|player| player.id)
        .unwrap_or_else(|| name.to_string())
}

pub fn object_name(replay: &Replay, object_id: i32) -> Option<String> {
    replay.objects.get(object_id as usize).cloned()
}

pub fn attribute_name(replay: &Replay, object_id: i32) -> Option<String> {
    replay.objects.get(object_id as usize).cloned()
}

fn string_prop(properties: &BTreeMap<String, serde_json::Value>, key: &str) -> Option<String> {
    properties
        .get(key)
        .and_then(|value| value.as_str())
        .map(ToString::to_string)
}

fn int_prop(properties: &BTreeMap<String, serde_json::Value>, key: &str) -> Option<i32> {
    properties
        .get(key)
        .and_then(|value| value.as_i64())
        .map(|value| value as i32)
}

fn float_prop(properties: &BTreeMap<String, serde_json::Value>, key: &str) -> Option<f32> {
    properties
        .get(key)
        .and_then(|value| value.as_f64())
        .map(|value| value as f32)
}

fn bool_prop(properties: &BTreeMap<String, serde_json::Value>, key: &str) -> Option<bool> {
    properties.get(key).and_then(|value| value.as_bool())
}

fn props_object(value: &serde_json::Value) -> Option<&serde_json::Map<String, serde_json::Value>> {
    value
        .as_object()
        .or_else(|| value.as_array()?.first()?.as_object())
}

fn json_int(obj: &serde_json::Map<String, serde_json::Value>, key: &str) -> Option<i32> {
    obj.get(key)
        .and_then(|value| value.as_i64())
        .map(|value| value as i32)
}

fn platform_value(value: &serde_json::Value) -> Option<&str> {
    value
        .as_str()
        .or_else(|| value.as_object()?.get("value")?.as_str())
}

fn stable_id(file_name: &str, replay_name: Option<&str>, duration: f32) -> String {
    let text = format!(
        "{}:{}:{:.2}",
        file_name,
        replay_name.unwrap_or(""),
        duration
    );
    let mut hash: u64 = 1469598103934665603;
    for byte in text.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(1099511628211);
    }
    format!("replay-{hash:x}")
}

pub fn parse_error(error: boxcars::ParseError) -> JsValue {
    JsValue::from_str(&error.to_string())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SemanticActorKind {
    Ball,
    Car,
    Player,
    Team,
    Unknown,
}

#[derive(Debug, Clone)]
struct ActorState {
    object_name: String,
    kind: SemanticActorKind,
    rigid_body: Option<RigidBodyFrame>,
    boost: Option<f32>,
    boost_active: Option<bool>,
    alive: bool,
}

fn classify_actor(name: &str) -> SemanticActorKind {
    let lowered = name.to_ascii_lowercase();
    if lowered.contains("ball") {
        SemanticActorKind::Ball
    } else if lowered.contains("car_default")
        || lowered.contains("tagame.car_ta")
        || lowered.ends_with(".car")
        || lowered.contains(".car.")
    {
        SemanticActorKind::Car
    } else if lowered.contains("playerreplicationinfo") || lowered.contains("pri_") {
        SemanticActorKind::Player
    } else if lowered.contains("team") {
        SemanticActorKind::Team
    } else {
        SemanticActorKind::Unknown
    }
}

pub fn actor_class_names(replay: &Replay) -> Vec<String> {
    let mut classes = BTreeSet::new();
    for class_index in &replay.class_indices {
        classes.insert(class_index.class.clone());
    }
    classes.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sample_replay_extracts_car_frames() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../cd2c5d33-422a-4d11-b6ca-9d827c5d26fe.replay");
        if !path.exists() {
            return;
        }

        let bytes = std::fs::read(path).unwrap();
        let timeline = parse_replay_timeline(&bytes, Some("sample.replay".into())).unwrap();
        let car_frames = timeline
            .frames
            .iter()
            .filter(|frame| !frame.cars.is_empty())
            .count();
        let max_cars = timeline
            .frames
            .iter()
            .map(|frame| frame.cars.len())
            .max()
            .unwrap_or(0);
        assert!(car_frames > 0, "expected car frames, got 0");
        assert!(
            max_cars >= 6,
            "expected at least six cars in a frame, got {max_cars}"
        );
        assert_eq!(timeline.frames.first().map(|frame| frame.t), Some(0.0));
        assert_eq!(timeline.metadata.match_length_seconds, Some(300));
        assert_eq!(timeline.metadata.forfeit, Some(true));
        assert_eq!(timeline.metadata.team_size, Some(3));
        assert_eq!(timeline.metadata.unfair_team_size, Some(1));
        assert_eq!(timeline.metadata.match_type.as_deref(), Some("Online"));
        assert_eq!(
            timeline.metadata.match_guid.as_deref(),
            Some("F55353A811F0FB45CBFED3A99DA27B6A")
        );
        assert_eq!(
            timeline.metadata.players[0]
                .stats
                .as_ref()
                .map(|stats| stats.score),
            Some(616)
        );
        assert_eq!(
            timeline.metadata.players[0].platform.as_deref(),
            Some("OnlinePlatform_Steam")
        );
        assert!(
            (timeline.metadata.total_seconds_played.unwrap_or_default() - 270.013).abs() < 0.01,
            "expected sample replay total live seconds"
        );
        assert!(
            timeline
                .events
                .iter()
                .any(|event| matches!(event, ReplayEvent::Save { .. })),
            "expected stat events to include saves"
        );
        assert!(
            timeline
                .clock
                .iter()
                .any(|sample| sample.seconds_remaining.is_some()),
            "expected parsed scoreboard clock samples"
        );
        let last_frame_time = timeline.frames.last().map(|frame| frame.t).unwrap();
        assert!(
            (last_frame_time - timeline.metadata.duration_seconds).abs() < 1.0,
            "expected frame clock to match metadata duration, got last={last_frame_time}, metadata={}",
            timeline.metadata.duration_seconds
        );
        assert!(
            timeline
                .events
                .iter()
                .any(|event| matches!(event, ReplayEvent::Goal { t, .. } if *t > 100.0)),
            "expected parsed goal frame times"
        );
        assert!(
            timeline
                .frames
                .iter()
                .flat_map(|frame| frame.cars.values())
                .any(|car| car.boost.is_some()),
            "expected car boost values copied from boost components"
        );
    }
}
