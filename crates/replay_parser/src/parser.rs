use crate::normalize::{identity_quat, now_ms, quat, vec3, vec3i};
use crate::types::*;
use boxcars::{Attribute, CamSettings, ParserBuilder, Replay};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use wasm_bindgen::prelude::*;

const PARSER_VERSION: &str = "rl-replay-parser-0.5.0+boxcars-0.11.5";
const STAT_EVENT_MATCH_WINDOW_SECONDS: f32 = 1.0;
const DEMO_EVENT_MATCH_WINDOW_SECONDS: f32 = 2.5;
const DUPLICATE_DEMO_WINDOW_SECONDS: f32 = 5.0;

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
    let NetworkInsights {
        metadata: network_metadata,
        players: network_players,
        events: network_events,
        camera,
        actor_name_to_player,
    } = extract_network_insights(&replay, &metadata);
    merge_network_metadata(&mut metadata, network_metadata);
    merge_player_insights(&mut metadata.players, network_players);
    let frames = extract_timeline_frames(&replay, &metadata);
    let clock = extract_clock_samples(&replay);
    metadata.match_length_seconds = match_length_seconds_from_clock(&clock);
    let mut events = goal_events(&replay);
    events.extend(highlight_events(&replay, &actor_name_to_player));
    events.extend(network_events);
    events = deduplicate_highlight_saves(events);
    events = clean_demo_events(events);
    events.sort_by(|a, b| event_time(a).total_cmp(&event_time(b)));

    Ok(ReplayTimeline {
        version: 1,
        metadata,
        frames,
        events,
        clock,
        camera,
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
    let mut actors: HashMap<i32, ActorState> = HashMap::new();
    let mut player_car: HashMap<i32, String> = HashMap::new();
    let mut pri_to_player: HashMap<i32, String> = HashMap::new();
    let mut boost_component_vehicle: HashMap<i32, i32> = HashMap::new();
    let mut frames = Vec::with_capacity(network.frames.len().min(6000));
    let mut t = 0.0;
    for frame in &network.frames {
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

            let is_boost_component_active_attr = object
                == "TAGame.CarComponent_TA:ReplicatedActive"
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
                t,
                ball,
                cars,
            });
        }
        t += frame.delta;
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
                rank: player_rank_from_properties(object),
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
                .map(|frame| replay_frame_time(replay, frame as usize, fps))
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

fn highlight_events(
    replay: &Replay,
    actor_name_to_player: &HashMap<String, String>,
) -> Vec<ReplayEvent> {
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
                .map(|frame| replay_frame_time(replay, frame as usize, fps))?;
            let player_id = object
                .get("CarName")
                .and_then(|value| value.as_str())
                .and_then(|name| actor_name_to_player.get(name))
                .cloned();
            Some(ReplayEvent::Save {
                t,
                player_id,
                label: Some("Save highlight".into()),
            })
        })
        .collect()
}

fn replay_frame_time(replay: &Replay, frame_index: usize, fps: f32) -> f32 {
    replay
        .network_frames
        .as_ref()
        .map(|network| {
            network
                .frames
                .iter()
                .take(frame_index)
                .map(|frame| frame.delta)
                .sum()
        })
        .unwrap_or(frame_index as f32 / fps)
}

fn extract_clock_samples(replay: &Replay) -> Vec<ReplayClockSample> {
    let Some(network) = &replay.network_frames else {
        return Vec::new();
    };
    let mut current = ReplayClockSample::default();
    let mut samples = Vec::new();
    let mut t = 0.0;

    for frame in &network.frames {
        let mut changed = false;

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
        t += frame.delta;
    }

    samples
}

#[derive(Default)]
struct NetworkInsights {
    metadata: NetworkMetadata,
    players: HashMap<String, ReplayPlayer>,
    events: Vec<ReplayEvent>,
    camera: Vec<ReplayCameraSample>,
    actor_name_to_player: HashMap<String, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum StatKind {
    Shot,
    Save,
    Demo,
}

#[derive(Debug, Clone, Copy)]
struct CounterEvent {
    t: f32,
    pri_actor_id: i32,
    kind: StatKind,
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
    let mut actors: HashMap<i32, String> = HashMap::new();
    let mut actor_names: HashMap<i32, String> = HashMap::new();
    let mut pri_to_player: HashMap<i32, String> = HashMap::new();
    let mut player_car: HashMap<i32, String> = HashMap::new();
    let mut camera_actor_pri: HashMap<i32, i32> = HashMap::new();
    let mut car_team_paint: HashMap<i32, ReplayTeamPaint> = HashMap::new();
    let mut stat_counter_values: HashMap<(i32, StatKind), i32> = HashMap::new();
    let mut counter_events = Vec::new();
    let mut insights = NetworkInsights::default();
    let mut t = 0.0;

    for frame in &network.frames {
        for actor in &frame.new_actors {
            actors.insert(
                actor.actor_id.0,
                object_name(replay, actor.object_id.0).unwrap_or_default(),
            );
            if let Some(name) = actor
                .name_id
                .and_then(|name_id| usize::try_from(name_id).ok())
                .and_then(|name_id| replay.names.get(name_id))
            {
                actor_names.insert(actor.actor_id.0, name.clone());
            }
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
                ("TAGame.PRI_TA:SkillTier", Attribute::Byte(value)) => {
                    update_player_rank(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |rank| rank.skill_tier = Some(*value as i32),
                    );
                }
                ("TAGame.PRI_TA:SkillTier", Attribute::Int(value)) => {
                    update_player_rank(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |rank| rank.skill_tier = Some(*value),
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
                    observe_stat_counter(
                        &mut stat_counter_values,
                        &mut counter_events,
                        updated.actor_id.0,
                        StatKind::Save,
                        *value,
                        t,
                    );
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.saves = *value,
                    );
                }
                ("TAGame.PRI_TA:MatchShots", Attribute::Int(value)) => {
                    observe_stat_counter(
                        &mut stat_counter_values,
                        &mut counter_events,
                        updated.actor_id.0,
                        StatKind::Shot,
                        *value,
                        t,
                    );
                    update_player_stats(
                        &mut insights.players,
                        &pri_to_player,
                        updated.actor_id.0,
                        |stats| stats.shots = *value,
                    );
                }
                ("TAGame.PRI_TA:MatchDemolishes", Attribute::Int(value)) => {
                    observe_stat_counter(
                        &mut stat_counter_values,
                        &mut counter_events,
                        updated.actor_id.0,
                        StatKind::Demo,
                        *value,
                        t,
                    );
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
                (
                    "TAGame.CameraSettingsActor_TA:ProfileSettings"
                    | "TAGame.PRI_TA:CameraSettings",
                    Attribute::CamSettings(settings),
                ) => {
                    if let Some(player_id) = camera_player_id(
                        &attribute,
                        updated.actor_id.0,
                        &camera_actor_pri,
                        &pri_to_player,
                    ) {
                        insights.camera.push(ReplayCameraSample {
                            t,
                            player_id,
                            settings: Some(camera_settings_from_boxcars(settings)),
                            ..ReplayCameraSample::default()
                        });
                    }
                }
                (
                    "TAGame.CameraSettingsActor_TA:bUsingSecondaryCamera"
                    | "TAGame.PRI_TA:bUsingSecondaryCamera",
                    Attribute::Boolean(value),
                ) => {
                    if let Some(player_id) = camera_player_id(
                        &attribute,
                        updated.actor_id.0,
                        &camera_actor_pri,
                        &pri_to_player,
                    ) {
                        insights.camera.push(ReplayCameraSample {
                            t,
                            player_id,
                            using_secondary_camera: Some(*value),
                            ..ReplayCameraSample::default()
                        });
                    }
                }
                (
                    "TAGame.CameraSettingsActor_TA:bUsingBehindView"
                    | "TAGame.PRI_TA:bUsingBehindView",
                    Attribute::Boolean(value),
                ) => {
                    if let Some(player_id) = camera_player_id(
                        &attribute,
                        updated.actor_id.0,
                        &camera_actor_pri,
                        &pri_to_player,
                    ) {
                        insights.camera.push(ReplayCameraSample {
                            t,
                            player_id,
                            using_behind_view: Some(*value),
                            ..ReplayCameraSample::default()
                        });
                    }
                }
                ("TAGame.CameraSettingsActor_TA:bUsingFreecam", Attribute::Boolean(value)) => {
                    if let Some(player_id) = camera_player_id(
                        &attribute,
                        updated.actor_id.0,
                        &camera_actor_pri,
                        &pri_to_player,
                    ) {
                        insights.camera.push(ReplayCameraSample {
                            t,
                            player_id,
                            using_freecam: Some(*value),
                            ..ReplayCameraSample::default()
                        });
                    }
                }
                ("TAGame.CameraSettingsActor_TA:bUsingSwivel", Attribute::Boolean(value)) => {
                    if let Some(player_id) = camera_player_id(
                        &attribute,
                        updated.actor_id.0,
                        &camera_actor_pri,
                        &pri_to_player,
                    ) {
                        insights.camera.push(ReplayCameraSample {
                            t,
                            player_id,
                            using_swivel: Some(*value),
                            ..ReplayCameraSample::default()
                        });
                    }
                }
                (
                    "TAGame.CameraSettingsActor_TA:CameraYaw" | "TAGame.PRI_TA:CameraYaw",
                    Attribute::Byte(value),
                ) => {
                    if let Some(player_id) = camera_player_id(
                        &attribute,
                        updated.actor_id.0,
                        &camera_actor_pri,
                        &pri_to_player,
                    ) {
                        insights.camera.push(ReplayCameraSample {
                            t,
                            player_id,
                            camera_yaw: Some(*value),
                            ..ReplayCameraSample::default()
                        });
                    }
                }
                (
                    "TAGame.CameraSettingsActor_TA:CameraPitch" | "TAGame.PRI_TA:CameraPitch",
                    Attribute::Byte(value),
                ) => {
                    if let Some(player_id) = camera_player_id(
                        &attribute,
                        updated.actor_id.0,
                        &camera_actor_pri,
                        &pri_to_player,
                    ) {
                        insights.camera.push(ReplayCameraSample {
                            t,
                            player_id,
                            camera_pitch: Some(*value),
                            ..ReplayCameraSample::default()
                        });
                    }
                }
                ("TAGame.Car_TA:ReplicatedDemolishExtended", Attribute::DemolishExtended(demo)) => {
                    let attacker_id = pri_to_player
                        .get(&demo.attacker_pri.actor.0)
                        .cloned()
                        .or_else(|| player_car.get(&demo.attacker.actor.0).cloned());
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
                ("TAGame.Car_TA:ReplicatedDemolish", Attribute::Demolish(demo)) => {
                    insights.events.push(ReplayEvent::Demo {
                        t,
                        attacker_id: player_car.get(&demo.attacker.0).cloned(),
                        victim_id: player_car.get(&demo.victim.0).cloned(),
                        label: Some("Demo".into()),
                    });
                }
                (
                    "TAGame.Car_TA:ReplicatedDemolish_CustomFX"
                    | "TAGame.Car_TA:ReplicatedDemolishGoalExplosion",
                    Attribute::DemolishFx(demo),
                ) => {
                    insights.events.push(ReplayEvent::Demo {
                        t,
                        attacker_id: player_car.get(&demo.attacker.0).cloned(),
                        victim_id: player_car.get(&demo.victim.0).cloned(),
                        label: Some("Demo".into()),
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
                    } else if name == "TAGame.PRI_TA:PersistentCamera" {
                        camera_actor_pri.insert(active.actor.0, updated.actor_id.0);
                    } else if name == "TAGame.CameraSettingsActor_TA:PRI" {
                        camera_actor_pri.insert(updated.actor_id.0, active.actor.0);
                    }
                }
                _ => {}
            }
        }
        t += frame.delta;
    }

    attribute_stat_events(&mut insights.events, &counter_events, &pri_to_player);
    reconcile_demo_events(&mut insights.events, &counter_events, &pri_to_player);
    insights.actor_name_to_player = player_car
        .iter()
        .filter_map(|(actor_id, player_id)| {
            actor_names
                .get(actor_id)
                .cloned()
                .map(|actor_name| (actor_name, player_id.clone()))
        })
        .collect();

    insights.camera.sort_by(|a, b| {
        a.t.total_cmp(&b.t)
            .then_with(|| a.player_id.cmp(&b.player_id))
    });
    insights
}

fn observe_stat_counter(
    previous_values: &mut HashMap<(i32, StatKind), i32>,
    counter_events: &mut Vec<CounterEvent>,
    pri_actor_id: i32,
    kind: StatKind,
    value: i32,
    t: f32,
) {
    let key = (pri_actor_id, kind);
    let previous = previous_values.insert(key, value).unwrap_or(0);

    if value > previous {
        for _ in 0..(value - previous) {
            counter_events.push(CounterEvent {
                t,
                pri_actor_id,
                kind,
            });
        }
    }
}

fn attribute_stat_events(
    events: &mut Vec<ReplayEvent>,
    counter_events: &[CounterEvent],
    pri_to_player: &HashMap<i32, String>,
) {
    let mut matched = vec![false; events.len()];
    let mut attributed_counters = counter_events
        .iter()
        .filter(|counter| counter.kind != StatKind::Demo)
        .filter_map(|counter| {
            pri_to_player
                .get(&counter.pri_actor_id)
                .cloned()
                .map(|player_id| (*counter, player_id))
        })
        .collect::<Vec<_>>();
    attributed_counters.sort_by(|(left, _), (right, _)| {
        left.t
            .total_cmp(&right.t)
            .then_with(|| left.pri_actor_id.cmp(&right.pri_actor_id))
    });

    for (counter, player_id) in attributed_counters {
        let best_match = events
            .iter()
            .enumerate()
            .filter_map(|(index, event)| {
                if matched[index] || stat_kind(event) != Some(counter.kind) {
                    return None;
                }
                let distance = (event_time(event) - counter.t).abs();
                (distance <= STAT_EVENT_MATCH_WINDOW_SECONDS).then_some((
                    index,
                    distance,
                    event_time(event),
                ))
            })
            .min_by(|left, right| {
                left.1
                    .total_cmp(&right.1)
                    .then_with(|| left.2.total_cmp(&right.2))
                    .then_with(|| left.0.cmp(&right.0))
            });

        if let Some((index, _, _)) = best_match {
            if assign_stat_event(&mut events[index], counter.t, player_id.clone()) {
                matched[index] = true;
                continue;
            }
        }

        events.push(stat_event_for_kind(counter.kind, counter.t, Some(player_id)));
        matched.push(true);
    }
}

fn stat_kind(event: &ReplayEvent) -> Option<StatKind> {
    match event {
        ReplayEvent::Shot { .. } => Some(StatKind::Shot),
        ReplayEvent::Save { .. } => Some(StatKind::Save),
        ReplayEvent::Demo { .. } => Some(StatKind::Demo),
        _ => None,
    }
}

fn assign_stat_event(event: &mut ReplayEvent, event_t: f32, event_player_id: String) -> bool {
    match event {
        ReplayEvent::Shot { t, player_id, .. } | ReplayEvent::Save { t, player_id, .. } => {
            *t = event_t;
            *player_id = Some(event_player_id);
            true
        }
        _ => false,
    }
}

fn stat_event_for_kind(kind: StatKind, t: f32, player_id: Option<String>) -> ReplayEvent {
    match kind {
        StatKind::Shot => ReplayEvent::Shot {
            t,
            player_id,
            label: Some("Shot".into()),
        },
        StatKind::Save => ReplayEvent::Save {
            t,
            player_id,
            label: Some("Save".into()),
        },
        StatKind::Demo => ReplayEvent::Demo {
            t,
            attacker_id: player_id,
            victim_id: None,
            label: Some("Demo".into()),
        },
    }
}

fn reconcile_demo_events(
    events: &mut Vec<ReplayEvent>,
    counter_events: &[CounterEvent],
    pri_to_player: &HashMap<i32, String>,
) {
    let mut credited_demos = counter_events
        .iter()
        .filter(|counter| counter.kind == StatKind::Demo)
        .filter_map(|counter| {
            pri_to_player
                .get(&counter.pri_actor_id)
                .cloned()
                .map(|player_id| (*counter, player_id))
        })
        .collect::<Vec<_>>();
    if credited_demos.is_empty() {
        return;
    }
    credited_demos.sort_by(|(left, _), (right, _)| {
        left.t
            .total_cmp(&right.t)
            .then_with(|| left.pri_actor_id.cmp(&right.pri_actor_id))
    });

    let mut raw_demos = events
        .iter()
        .filter_map(|event| match event {
            ReplayEvent::Demo {
                t,
                attacker_id,
                victim_id,
                label,
            } => Some((*t, attacker_id.clone(), victim_id.clone(), label.clone())),
            _ => None,
        })
        .collect::<Vec<_>>();
    raw_demos.sort_by(|left, right| left.0.total_cmp(&right.0));
    let mut matched = vec![false; raw_demos.len()];
    events.retain(|event| !matches!(event, ReplayEvent::Demo { .. }));

    for (counter, player_id) in credited_demos {
        let best_match = raw_demos
            .iter()
            .enumerate()
            .filter_map(|(index, (raw_t, raw_attacker, _, _))| {
                if matched[index]
                    || raw_attacker
                        .as_ref()
                        .is_some_and(|attacker| attacker != &player_id)
                {
                    return None;
                }
                let distance = (*raw_t - counter.t).abs();
                (distance <= DEMO_EVENT_MATCH_WINDOW_SECONDS).then_some((index, distance, *raw_t))
            })
            .min_by(|left, right| {
                left.1
                    .total_cmp(&right.1)
                    .then_with(|| left.2.total_cmp(&right.2))
                    .then_with(|| left.0.cmp(&right.0))
            });

        if let Some((index, _, _)) = best_match {
            matched[index] = true;
            let (t, _, victim_id, label) = &raw_demos[index];
            events.push(ReplayEvent::Demo {
                t: *t,
                attacker_id: Some(player_id),
                victim_id: victim_id.clone(),
                label: label.clone().or_else(|| Some("Demo".into())),
            });
        } else {
            events.push(ReplayEvent::Demo {
                t: counter.t,
                attacker_id: Some(player_id),
                victim_id: None,
                label: Some("Demo".into()),
            });
        }
    }
}

fn deduplicate_highlight_saves(events: Vec<ReplayEvent>) -> Vec<ReplayEvent> {
    let network_save_times = events
        .iter()
        .filter_map(|event| match event {
            ReplayEvent::Save { t, label, .. } if label.as_deref() != Some("Save highlight") => {
                Some(*t)
            }
            _ => None,
        })
        .collect::<Vec<_>>();

    events
        .into_iter()
        .filter(|event| match event {
            ReplayEvent::Save {
                t,
                label: Some(label),
                ..
            } if label == "Save highlight" => !network_save_times
                .iter()
                .any(|network_t| (*network_t - *t).abs() <= STAT_EVENT_MATCH_WINDOW_SECONDS),
            _ => true,
        })
        .collect()
}

fn clean_demo_events(events: Vec<ReplayEvent>) -> Vec<ReplayEvent> {
    let mut kept_demo_pairs: Vec<(f32, String, Option<String>)> = Vec::new();

    events
        .into_iter()
        .filter(|event| {
            let ReplayEvent::Demo {
                t,
                attacker_id: Some(attacker_id),
                victim_id,
                ..
            } = event
            else {
                return !matches!(event, ReplayEvent::Demo { .. });
            };

            if victim_id.as_ref() == Some(attacker_id) {
                return false;
            }
            if kept_demo_pairs.iter().any(|(kept_t, kept_attacker, kept_victim)| {
                kept_attacker == attacker_id
                    && kept_victim == victim_id
                    && (*kept_t - *t).abs() <= DUPLICATE_DEMO_WINDOW_SECONDS
            }) {
                return false;
            }
            kept_demo_pairs.push((*t, attacker_id.clone(), victim_id.clone()));
            true
        })
        .collect()
}

fn camera_player_id(
    attribute: &str,
    actor_id: i32,
    camera_actor_pri: &HashMap<i32, i32>,
    pri_to_player: &HashMap<i32, String>,
) -> Option<String> {
    if attribute.starts_with("TAGame.PRI_TA:") {
        return pri_to_player.get(&actor_id).cloned();
    }
    camera_actor_pri
        .get(&actor_id)
        .and_then(|pri_actor_id| pri_to_player.get(pri_actor_id))
        .cloned()
}

fn camera_settings_from_boxcars(settings: &CamSettings) -> ReplayCameraSettings {
    ReplayCameraSettings {
        fov: settings.fov,
        height: settings.height,
        angle: settings.angle,
        distance: settings.distance,
        stiffness: settings.stiffness,
        swivel: settings.swivel,
        transition: settings.transition,
    }
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
        if insight.rank.is_some() {
            player.rank = insight.rank.clone();
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

fn update_player_rank<F>(
    players: &mut HashMap<String, ReplayPlayer>,
    pri_to_player: &HashMap<i32, String>,
    pri_actor_id: i32,
    update: F,
) where
    F: FnOnce(&mut ReplayPlayerRank),
{
    update_player(players, pri_to_player, pri_actor_id, |player| {
        let rank = player.rank.get_or_insert_with(ReplayPlayerRank::default);
        update(rank);
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
        rank: None,
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

fn json_int_any_key(obj: &serde_json::Map<String, serde_json::Value>, keys: &[&str]) -> Option<i32> {
    keys.iter().find_map(|key| {
        json_int(obj, key).or_else(|| {
            obj.iter()
                .find(|(candidate, _)| normalized_key(candidate) == normalized_key(key))
                .and_then(|(_, value)| value.as_i64())
                .map(|value| value as i32)
        })
    })
}

fn normalized_key(key: &str) -> String {
    key.chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

fn player_rank_from_properties(
    object: Option<&serde_json::Map<String, serde_json::Value>>,
) -> Option<ReplayPlayerRank> {
    let obj = object?;
    let rank = ReplayPlayerRank {
        skill_tier: json_int_any_key(obj, &["SkillTier", "Rank", "Tier"]),
        mmr: json_int_any_key(obj, &["MMR", "Mmr", "Elo", "Rating"]),
    };
    if rank.skill_tier.is_some() || rank.mmr.is_some() {
        Some(rank)
    } else {
        None
    }
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
    use serde_json::json;

    #[test]
    fn player_rank_from_properties_accepts_common_rank_key_casing() {
        let lower = json!({
            "skill_tier": 16,
            "mmr": 1194
        });
        let lower = lower.as_object().unwrap();

        let rank = player_rank_from_properties(Some(lower)).unwrap();

        assert_eq!(rank.skill_tier, Some(16));
        assert_eq!(rank.mmr, Some(1194));

        let elo = json!({
            "rank": 18,
            "ELO": 1310
        });
        let elo = elo.as_object().unwrap();

        let rank = player_rank_from_properties(Some(elo)).unwrap();

        assert_eq!(rank.skill_tier, Some(18));
        assert_eq!(rank.mmr, Some(1310));
    }

    #[test]
    fn attributes_stat_events_to_nearest_player_counter_updates() {
        let mut events = vec![
            ReplayEvent::Shot {
                t: 10.1,
                player_id: None,
                label: Some("StatEvent_Shot".into()),
            },
            ReplayEvent::Save {
                t: 20.2,
                player_id: None,
                label: Some("StatEvent_Save".into()),
            },
        ];
        let counter_events = [
            CounterEvent {
                t: 10.0,
                pri_actor_id: 3,
                kind: StatKind::Shot,
            },
            CounterEvent {
                t: 20.9,
                pri_actor_id: 4,
                kind: StatKind::Save,
            },
        ];
        let pri_to_player = HashMap::from([
            (3, "player-shot".to_string()),
            (4, "player-save".to_string()),
        ]);

        attribute_stat_events(&mut events, &counter_events, &pri_to_player);

        assert!(matches!(
            &events[0],
            ReplayEvent::Shot {
                player_id: Some(player_id),
                ..
            } if player_id == "player-shot"
        ));
        assert!(matches!(
            &events[1],
            ReplayEvent::Save {
                player_id: Some(player_id),
                ..
            } if player_id == "player-save"
        ));
    }

    #[test]
    fn counter_deltas_include_initial_positive_values_and_each_increment() {
        let mut previous_values = HashMap::new();
        let mut counter_events = Vec::new();

        observe_stat_counter(
            &mut previous_values,
            &mut counter_events,
            7,
            StatKind::Shot,
            2,
            1.0,
        );
        observe_stat_counter(
            &mut previous_values,
            &mut counter_events,
            7,
            StatKind::Shot,
            4,
            2.0,
        );
        observe_stat_counter(
            &mut previous_values,
            &mut counter_events,
            7,
            StatKind::Shot,
            1,
            3.0,
        );

        assert_eq!(counter_events.len(), 4);
        assert_eq!(counter_events.iter().filter(|event| event.t == 1.0).count(), 2);
        assert_eq!(counter_events.iter().filter(|event| event.t == 2.0).count(), 2);
    }

    #[test]
    fn save_highlights_are_deduplicated_against_network_saves() {
        let events = vec![
            ReplayEvent::Save {
                t: 5.0,
                player_id: Some("player-9".into()),
                label: Some("Save highlight".into()),
            },
            ReplayEvent::Save {
                t: 5.1,
                player_id: Some("player-9".into()),
                label: Some("Save".into()),
            },
        ];

        let events = deduplicate_highlight_saves(events);

        assert_eq!(events.len(), 1);
        assert!(matches!(
            &events[0],
            ReplayEvent::Save {
                player_id: Some(player_id),
                ..
            } if player_id == "player-9"
        ));
    }

    #[test]
    fn demo_cleanup_keeps_only_distinct_attributed_demolitions() {
        let events = vec![
            ReplayEvent::Demo {
                t: 10.0,
                attacker_id: Some("attacker".into()),
                victim_id: Some("victim".into()),
                label: Some("Demo".into()),
            },
            ReplayEvent::Demo {
                t: 11.5,
                attacker_id: Some("attacker".into()),
                victim_id: Some("victim".into()),
                label: Some("Demo".into()),
            },
            ReplayEvent::Demo {
                t: 20.0,
                attacker_id: None,
                victim_id: Some("victim".into()),
                label: Some("Demo".into()),
            },
            ReplayEvent::Shot {
                t: 20.0,
                player_id: Some("attacker".into()),
                label: Some("Shot".into()),
            },
        ];

        let events = clean_demo_events(events);

        assert_eq!(events.len(), 2);
        assert!(matches!(events[0], ReplayEvent::Demo { .. }));
        assert!(matches!(events[1], ReplayEvent::Shot { .. }));
    }

    #[test]
    fn demo_counters_limit_duplicate_network_events_and_preserve_victims() {
        let mut events = vec![
            ReplayEvent::Demo {
                t: 10.0,
                attacker_id: Some("attacker".into()),
                victim_id: Some("victim".into()),
                label: Some("Demo".into()),
            },
            ReplayEvent::Demo {
                t: 13.0,
                attacker_id: Some("attacker".into()),
                victim_id: Some("victim".into()),
                label: Some("Demo".into()),
            },
        ];
        let counters = [CounterEvent {
            t: 10.1,
            pri_actor_id: 7,
            kind: StatKind::Demo,
        }];
        let players = HashMap::from([(7, "attacker".to_string())]);

        reconcile_demo_events(&mut events, &counters, &players);

        assert_eq!(events.len(), 1);
        assert!(matches!(
            &events[0],
            ReplayEvent::Demo {
                attacker_id: Some(attacker_id),
                victim_id: Some(victim_id),
                ..
            } if attacker_id == "attacker" && victim_id == "victim"
        ));
    }

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
        let player_ids = timeline
            .metadata
            .players
            .iter()
            .map(|player| player.id.as_str())
            .collect::<BTreeSet<_>>();
        let attributed_stat_events = timeline
            .events
            .iter()
            .filter_map(|event| match event {
                ReplayEvent::Shot { player_id, .. } | ReplayEvent::Save { player_id, .. } => {
                    player_id.as_deref()
                }
                _ => None,
            })
            .collect::<Vec<_>>();
        assert!(
            !attributed_stat_events.is_empty(),
            "expected shot/save events to include player IDs"
        );
        assert!(
            attributed_stat_events
                .iter()
                .all(|player_id| player_ids.contains(player_id)),
            "expected all attributed shot/save IDs to belong to replay players"
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
        assert!(
            timeline.camera.iter().any(|sample| sample
                .settings
                .as_ref()
                .is_some_and(|settings| settings.fov > 0.0)),
            "expected player camera settings from replay camera actors"
        );
        assert!(
            timeline
                .camera
                .iter()
                .any(|sample| sample.using_secondary_camera.is_some()),
            "expected ball cam toggle samples from replay camera actors"
        );
        assert_sample_events_match_ballchasing(&timeline);
    }

    fn assert_sample_events_match_ballchasing(timeline: &ReplayTimeline) {
        // Public timeline source:
        // https://ballchasing.com/replay/cd2c5d33-422a-4d11-b6ca-9d827c5d26fe
        let expected: [(&str, &str, &[f32]); 18] = [
            ("Kehvn", "shot", &[134.0408, 139.1211, 283.6341, 338.60126]),
            ("Kehvn", "save", &[26.456776]),
            ("Kehvn", "goal", &[139.3227, 338.83652]),
            ("tnt.", "shot", &[110.45724, 136.01532, 272.86038, 300.8526]),
            ("tnt.", "save", &[195.97919, 225.47202]),
            ("tnt.", "goal", &[273.5614, 301.11984]),
            ("tnt.", "demo", &[323.00537]),
            ("Zax", "shot", &[39.807022, 73.321815, 153.48836, 231.61151]),
            ("Zax", "goal", &[232.34814]),
            ("Zax", "demo", &[100.239685]),
            ("millon", "shot", &[26.022633, 100.13946, 195.97919, 224.43866]),
            ("millon", "save", &[72.78831, 111.32887, 133.97415, 154.48929, 284.6341]),
            ("millon", "demo", &[68.41289]),
            ("alejandrodls", "shot", &[117.80393, 198.02072]),
            ("alejandrodls", "goal", &[117.80393, 198.08887]),
            ("El Games Lolo", "shot", &[174.69296]),
            ("El Games Lolo", "save", &[136.01532]),
            ("El Games Lolo", "goal", &[174.69296]),
        ];
        let player_names = timeline
            .metadata
            .players
            .iter()
            .map(|player| (player.id.as_str(), player.name.as_str()))
            .collect::<HashMap<_, _>>();
        let mut actual: HashMap<(String, &'static str), Vec<f32>> = HashMap::new();

        for event in &timeline.events {
            let (player_id, event_type, t) = match event {
                ReplayEvent::Goal { scorer_id, t, .. } => (scorer_id.as_deref(), "goal", *t),
                ReplayEvent::Shot { player_id, t, .. } => (player_id.as_deref(), "shot", *t),
                ReplayEvent::Save { player_id, t, .. } => (player_id.as_deref(), "save", *t),
                ReplayEvent::Demo { attacker_id, t, .. } => (attacker_id.as_deref(), "demo", *t),
            };
            let player_name = player_id.and_then(|player_id| player_names.get(player_id)).copied();
            assert!(player_name.is_some(), "expected every scored event to have a known player");
            actual
                .entry((player_name.unwrap().to_string(), event_type))
                .or_default()
                .push(t);
        }

        for times in actual.values_mut() {
            times.sort_by(f32::total_cmp);
        }

        for (player_name, event_type, expected_times) in expected {
            let actual_times = actual
                .remove(&(player_name.to_string(), event_type))
                .unwrap_or_default();
            assert_eq!(
                actual_times.len(),
                expected_times.len(),
                "Ballchasing {event_type} count differed for {player_name}"
            );
            for (actual_time, expected_time) in actual_times.iter().zip(expected_times) {
                assert!(
                    (actual_time - expected_time).abs() < 0.15,
                    "Ballchasing {event_type} time differed for {player_name}: parser={actual_time}, expected={expected_time}"
                );
            }
        }
        assert!(actual.is_empty(), "parser emitted extra attributed sample events: {actual:?}");
    }
}
