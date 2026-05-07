declare module "../../crates/replay_parser/pkg/replay_parser.js" {
  const init: () => Promise<void>;
  export default init;
  export function parse_replay_metadata(bytes: Uint8Array, fileName?: string): unknown;
  export function parse_replay_timeline(bytes: Uint8Array, fileName?: string): unknown;
  export function inspect_replay(bytes: Uint8Array, fileName?: string): unknown;
}
