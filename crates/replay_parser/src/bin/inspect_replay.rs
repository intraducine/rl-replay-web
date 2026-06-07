use boxcars::{Attribute, ParserBuilder};
use std::collections::BTreeMap;

fn main() {
    let path = std::env::args()
        .nth(1)
        .expect("usage: inspect_replay <file.replay>");
    let bytes = std::fs::read(path).expect("read replay");
    let replay = ParserBuilder::new(&bytes)
        .must_parse_network_data()
        .on_error_check_crc()
        .parse()
        .expect("parse replay");
    let mut actor_objects: BTreeMap<i32, String> = BTreeMap::new();
    let mut actor_kinds: BTreeMap<i32, String> = BTreeMap::new();
    let mut actor_has_body: BTreeMap<i32, bool> = BTreeMap::new();
    let mut rigid_counts: BTreeMap<String, usize> = BTreeMap::new();
    let mut actor_rigid_counts: BTreeMap<i32, usize> = BTreeMap::new();
    let mut frames_with_cars = 0usize;
    let print_links = std::env::var("PRINT_LINKS").is_ok();
    let print_boost = std::env::var("PRINT_BOOST").is_ok();
    let print_camera = std::env::var("PRINT_CAMERA").is_ok();
    let print_rank = std::env::var("PRINT_RANK").is_ok();
    let print_player_stats = std::env::var("PRINT_PLAYER_STATS").is_ok();

    if print_player_stats {
        if let Some(value) = replay
            .properties
            .iter()
            .find(|(key, _)| key.as_str() == "PlayerStats")
            .map(|(_, value)| value)
        {
            println!("{}", serde_json::to_string_pretty(value).expect("serialize PlayerStats"));
        }
    }

    if let Some(network) = &replay.network_frames {
        for frame in &network.frames {
            for actor in &frame.new_actors {
                let name = replay
                    .objects
                    .get(actor.object_id.0 as usize)
                    .cloned()
                    .unwrap_or_else(|| format!("object-{}", actor.object_id.0));
                actor_objects.insert(actor.actor_id.0, name);
                actor_kinds.insert(
                    actor.actor_id.0,
                    classify(actor_objects.get(&actor.actor_id.0).unwrap()),
                );
            }
            for update in &frame.updated_actors {
                if print_camera {
                    let actor_name = actor_objects
                        .get(&update.actor_id.0)
                        .cloned()
                        .unwrap_or_else(|| "unknown-actor".into());
                    let attr_name = replay
                        .objects
                        .get(update.object_id.0 as usize)
                        .cloned()
                        .unwrap_or_else(|| format!("attr-{}", update.object_id.0));
                    if actor_name.contains("CameraSettingsActor")
                        || attr_name.contains("CameraSettings")
                        || attr_name.contains("Camera")
                        || attr_name.contains("PersistentCamera")
                        || attr_name.contains("SecondaryCamera")
                        || attr_name.contains("BehindView")
                        || attr_name.contains("Freecam")
                        || attr_name.contains("ProfileSettings")
                    {
                        println!(
                            "t={:.3} actor {} ({}) attr {} -> {:?}",
                            frame.time, update.actor_id.0, actor_name, attr_name, update.attribute
                        );
                    }
                }

                if print_boost {
                    let actor_name = actor_objects
                        .get(&update.actor_id.0)
                        .cloned()
                        .unwrap_or_else(|| "unknown-actor".into());
                    let attr_name = replay
                        .objects
                        .get(update.object_id.0 as usize)
                        .cloned()
                        .unwrap_or_else(|| format!("attr-{}", update.object_id.0));
                    if actor_name
                        .to_ascii_lowercase()
                        .contains("carcomponent_boost")
                        || attr_name.to_ascii_lowercase().contains("boost")
                        || attr_name == "TAGame.CarComponent_TA:ReplicatedActive"
                        || attr_name == "TAGame.CarComponent_TA:ReplicatedActivityTime"
                    {
                        println!(
                            "t={:.3} actor {} ({}) attr {} -> {:?}",
                            frame.time, update.actor_id.0, actor_name, attr_name, update.attribute
                        );
                    }
                }

                if print_rank {
                    let actor_name = actor_objects
                        .get(&update.actor_id.0)
                        .cloned()
                        .unwrap_or_else(|| "unknown-actor".into());
                    let attr_name = replay
                        .objects
                        .get(update.object_id.0 as usize)
                        .cloned()
                        .unwrap_or_else(|| format!("attr-{}", update.object_id.0));
                    let lowered = attr_name.to_ascii_lowercase();
                    if lowered.contains("skill")
                        || lowered.contains("rank")
                        || lowered.contains("mmr")
                        || lowered.contains("tier")
                    {
                        println!(
                            "t={:.3} actor {} ({}) attr {} -> {:?}",
                            frame.time, update.actor_id.0, actor_name, attr_name, update.attribute
                        );
                    }
                }

                match &update.attribute {
                    Attribute::RigidBody(_) => {
                        actor_has_body.insert(update.actor_id.0, true);
                        *actor_rigid_counts.entry(update.actor_id.0).or_default() += 1;
                        let actor_name = actor_objects
                            .get(&update.actor_id.0)
                            .cloned()
                            .unwrap_or_else(|| "unknown-actor".into());
                        let attr_name = replay
                            .objects
                            .get(update.object_id.0 as usize)
                            .cloned()
                            .unwrap_or_else(|| format!("attr-{}", update.object_id.0));
                        *rigid_counts
                            .entry(format!("{actor_name} <= {attr_name}"))
                            .or_default() += 1;
                    }
                    Attribute::ActiveActor(active) if print_links => {
                        let actor_name = actor_objects
                            .get(&update.actor_id.0)
                            .cloned()
                            .unwrap_or_else(|| "unknown-actor".into());
                        let attr_name = replay
                            .objects
                            .get(update.object_id.0 as usize)
                            .cloned()
                            .unwrap_or_else(|| format!("attr-{}", update.object_id.0));
                        let target_name = actor_objects
                            .get(&active.actor.0)
                            .cloned()
                            .unwrap_or_else(|| format!("unknown-target-{}", active.actor.0));
                        println!(
                            "t={:.3} actor {} ({}) attr {} -> active={} target {} ({})",
                            frame.time,
                            update.actor_id.0,
                            actor_name,
                            attr_name,
                            active.active,
                            active.actor.0,
                            target_name
                        );
                    }
                    Attribute::String(value) if print_links => {
                        let actor_name = actor_objects
                            .get(&update.actor_id.0)
                            .cloned()
                            .unwrap_or_else(|| "unknown-actor".into());
                        let attr_name = replay
                            .objects
                            .get(update.object_id.0 as usize)
                            .cloned()
                            .unwrap_or_else(|| format!("attr-{}", update.object_id.0));
                        if attr_name.to_ascii_lowercase().contains("player")
                            || actor_name.to_ascii_lowercase().contains("player")
                        {
                            println!(
                                "t={:.3} actor {} ({}) attr {} -> string {:?}",
                                frame.time, update.actor_id.0, actor_name, attr_name, value
                            );
                        }
                    }
                    _ => {}
                }
            }
            let car_count = actor_has_body
                .keys()
                .filter(|id| actor_kinds.get(id).map(|k| k == "car").unwrap_or(false))
                .count();
            if car_count > 0 {
                frames_with_cars += 1;
            }
        }
    }

    for (name, count) in rigid_counts.iter().rev().take(80) {
        println!("{count:>6} {name}");
    }
    println!("actor rigid counts: {}", actor_rigid_counts.len());
    println!("frames_with_cars: {frames_with_cars}");
}

fn classify(name: &str) -> String {
    let lowered = name.to_ascii_lowercase();
    if lowered.contains("ball") {
        "ball".into()
    } else if lowered.contains("car_default")
        || lowered.contains("tagame.car_ta")
        || lowered.ends_with(".car")
        || lowered.contains(".car.")
    {
        "car".into()
    } else {
        "unknown".into()
    }
}
