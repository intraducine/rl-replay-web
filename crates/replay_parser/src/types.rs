use serde::Serialize;
use std::collections::BTreeMap;

pub type Vec3 = [f32; 3];
pub type Quat = [f32; 4];

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayMetadata {
    pub id: String,
    pub file_name: String,
    pub replay_name: Option<String>,
    pub map_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    pub duration_seconds: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_length_seconds: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_seconds_played: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forfeit: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_guid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub team_size: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unfair_team_size: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub playlist: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_region: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_server_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changelist: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_version: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replay_version: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replay_last_save_version: Option<i32>,
    pub created_at: f64,
    pub parser_version: String,
    pub players: Vec<ReplayPlayer>,
    pub teams: Vec<ReplayTeam>,
    pub source: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReplayTeam {
    pub id: u8,
    pub name: String,
    pub score: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayer {
    pub id: String,
    pub name: String,
    pub team: u8,
    pub car_actor_id: Option<i32>,
    pub platform_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stats: Option<ReplayPlayerStats>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cosmetics: Option<ReplayPlayerCosmetics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rank: Option<ReplayPlayerRank>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ping: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub club_id: Option<String>,
}

#[derive(Debug, Default, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayerRank {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skill_tier: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mmr: Option<i32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayerStats {
    pub score: i32,
    pub goals: i32,
    pub assists: i32,
    pub saves: i32,
    pub shots: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub demos: Option<i32>,
}

#[derive(Debug, Default, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayerCosmetics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub team_paint: Option<ReplayTeamPaint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loadout: Option<ReplayLoadout>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayTeamPaint {
    pub team: u8,
    pub primary_color: u8,
    pub accent_color: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_finish: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accent_finish: Option<u32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayLoadout {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decal: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wheels: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub boost: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub antenna: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topper: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engine_audio: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trail: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub goal_explosion: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner: Option<u32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RigidBodyFrame {
    pub position: Vec3,
    pub rotation: Quat,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub velocity: Option<Vec3>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub angular_velocity: Option<Vec3>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CarFrame {
    pub position: Vec3,
    pub rotation: Quat,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub velocity: Option<Vec3>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub angular_velocity: Option<Vec3>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub boost: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub boost_active: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub demolished: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supersonic: Option<bool>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TimelineFrame {
    pub t: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ball: Option<RigidBodyFrame>,
    pub cars: BTreeMap<String, CarFrame>,
}

#[derive(Debug, Serialize, Clone)]
#[allow(dead_code)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum ReplayEvent {
    Goal {
        t: f32,
        scorer_id: Option<String>,
        team: u8,
        label: Option<String>,
    },
    Demo {
        t: f32,
        attacker_id: Option<String>,
        victim_id: Option<String>,
        label: Option<String>,
    },
    Shot {
        t: f32,
        player_id: Option<String>,
        label: Option<String>,
    },
    Save {
        t: f32,
        player_id: Option<String>,
        label: Option<String>,
    },
}

#[derive(Debug, Default, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayClockSample {
    pub t: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seconds_remaining: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state_time_remaining: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_time_seconds: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overtime: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ball_has_been_hit: Option<bool>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayCameraSettings {
    pub fov: f32,
    pub height: f32,
    pub angle: f32,
    pub distance: f32,
    pub stiffness: f32,
    pub swivel: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transition: Option<f32>,
}

#[derive(Debug, Default, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplayCameraSample {
    pub t: f32,
    pub player_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<ReplayCameraSettings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub using_secondary_camera: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub using_behind_view: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub using_freecam: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub using_swivel: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub camera_yaw: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub camera_pitch: Option<u8>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReplayTimeline {
    pub version: u8,
    pub metadata: ReplayMetadata,
    pub frames: Vec<TimelineFrame>,
    pub events: Vec<ReplayEvent>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub clock: Vec<ReplayClockSample>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub camera: Vec<ReplayCameraSample>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayInspection {
    pub header: BTreeMap<String, serde_json::Value>,
    pub properties: BTreeMap<String, serde_json::Value>,
    pub actor_classes: Vec<String>,
    pub property_names: Vec<String>,
    pub players: Vec<ReplayPlayer>,
    pub candidate_actors: CandidateActors,
    pub frame_stats: FrameStats,
    pub warnings: Vec<String>,
}

#[derive(Debug, Default, Serialize)]
pub struct CandidateActors {
    pub ball: Vec<i32>,
    pub cars: Vec<i32>,
    pub players: Vec<i32>,
    pub teams: Vec<i32>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameStats {
    pub total_frames: usize,
    pub frames_with_ball: usize,
    pub frames_with_cars: usize,
}
