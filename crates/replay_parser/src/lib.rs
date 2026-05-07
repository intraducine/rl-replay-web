mod debug;
mod normalize;
mod parser;
mod types;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse_replay_metadata(bytes: &[u8], file_name: Option<String>) -> Result<JsValue, JsValue> {
    parser::parse_replay_metadata(bytes, file_name).and_then(to_js)
}

#[wasm_bindgen]
pub fn parse_replay_timeline(bytes: &[u8], file_name: Option<String>) -> Result<JsValue, JsValue> {
    parser::parse_replay_timeline(bytes, file_name).and_then(to_js)
}

#[wasm_bindgen]
pub fn inspect_replay(bytes: &[u8], file_name: Option<String>) -> Result<JsValue, JsValue> {
    debug::inspect_replay(bytes, file_name).and_then(to_js)
}

fn to_js<T: serde::Serialize>(value: T) -> Result<JsValue, JsValue> {
    let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
    value
        .serialize(&serializer)
        .map_err(|err| JsValue::from_str(&err.to_string()))
}
