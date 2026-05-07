use crate::parser::{
    actor_class_names, attribute_name, metadata_from_replay, object_name, parse_error, property_map,
};
use crate::types::*;
use boxcars::ParserBuilder;
use std::collections::BTreeSet;
use wasm_bindgen::prelude::*;

pub fn inspect_replay(
    bytes: &[u8],
    file_name: Option<String>,
) -> Result<ReplayInspection, JsValue> {
    let replay = ParserBuilder::new(bytes)
        .ignore_network_data_on_error()
        .on_error_check_crc()
        .parse()
        .map_err(parse_error)?;
    let metadata = metadata_from_replay(&replay, file_name);
    let properties = property_map(&replay);
    let mut candidate_actors = CandidateActors::default();
    let mut property_names = BTreeSet::new();
    let mut warnings = Vec::new();
    let mut frame_stats = FrameStats::default();

    if let Some(network) = &replay.network_frames {
        frame_stats.total_frames = network.frames.len();
        for frame in &network.frames {
            let mut frame_has_ball = false;
            let mut frame_has_car = false;
            for actor in &frame.new_actors {
                let name = object_name(&replay, actor.object_id.0).unwrap_or_default();
                let lowered = name.to_ascii_lowercase();
                if lowered.contains("ball") {
                    candidate_actors.ball.push(actor.actor_id.0);
                    frame_has_ball = true;
                } else if lowered.contains("car_default")
                    || lowered.contains("tagame.car_ta")
                    || lowered.ends_with(".car")
                    || lowered.contains(".car.")
                {
                    candidate_actors.cars.push(actor.actor_id.0);
                    frame_has_car = true;
                } else if lowered.contains("player") {
                    candidate_actors.players.push(actor.actor_id.0);
                } else if lowered.contains("team") {
                    candidate_actors.teams.push(actor.actor_id.0);
                }
            }

            for update in &frame.updated_actors {
                if let Some(name) = attribute_name(&replay, update.object_id.0) {
                    property_names.insert(name);
                }
            }

            if frame_has_ball {
                frame_stats.frames_with_ball += 1;
            }
            if frame_has_car {
                frame_stats.frames_with_cars += 1;
            }
        }
    } else {
        warnings.push(
            "Network frames were not available; this replay version may need parser updates."
                .into(),
        );
    }

    candidate_actors.ball.sort_unstable();
    candidate_actors.ball.dedup();
    candidate_actors.cars.sort_unstable();
    candidate_actors.cars.dedup();
    candidate_actors.players.sort_unstable();
    candidate_actors.players.dedup();
    candidate_actors.teams.sort_unstable();
    candidate_actors.teams.dedup();

    let mut header = std::collections::BTreeMap::new();
    header.insert(
        "majorVersion".into(),
        serde_json::json!(replay.major_version),
    );
    header.insert(
        "minorVersion".into(),
        serde_json::json!(replay.minor_version),
    );
    header.insert("netVersion".into(), serde_json::json!(replay.net_version));
    header.insert("gameType".into(), serde_json::json!(replay.game_type));
    header.insert("levels".into(), serde_json::json!(replay.levels));
    header.insert("packages".into(), serde_json::json!(replay.packages));

    Ok(ReplayInspection {
        header,
        properties,
        actor_classes: actor_class_names(&replay),
        property_names: property_names.into_iter().collect(),
        players: metadata.players,
        candidate_actors,
        frame_stats,
        warnings,
    })
}
