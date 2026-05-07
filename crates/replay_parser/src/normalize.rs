use crate::types::{Quat, Vec3};

pub fn vec3(v: boxcars::Vector3f) -> Vec3 {
    [v.x, v.y, v.z]
}

pub fn vec3i(v: boxcars::Vector3i) -> Vec3 {
    [v.x as f32, v.y as f32, v.z as f32]
}

pub fn quat(q: boxcars::Quaternion) -> Quat {
    [q.x, q.y, q.z, q.w]
}

pub fn identity_quat() -> Quat {
    [0.0, 0.0, 0.0, 1.0]
}

pub fn now_ms() -> f64 {
    #[cfg(target_arch = "wasm32")]
    {
        js_sys::Date::now()
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as f64)
            .unwrap_or(0.0)
    }
}
