import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const hasWasmPack = spawnSync("wasm-pack", ["--version"], { stdio: "ignore" }).status === 0;

if (!hasWasmPack) {
  writeFallbackParser("wasm-pack is not installed; skipping Rust WASM build and using worker fallback.");
  process.exit(0);
}

const result = spawnSync("wasm-pack", ["build", "crates/replay_parser", "--target", "web", "--out-dir", "pkg"], {
  stdio: "inherit"
});

if ((result.status ?? 1) !== 0 && process.env.CI !== "true") {
  writeFallbackParser("wasm-pack failed in local development; using worker fallback. CI will still fail on this error.");
  process.exit(0);
}

process.exit(result.status ?? 1);

function writeFallbackParser(message) {
  console.warn(message);
  mkdirSync("crates/replay_parser/pkg", { recursive: true });
  if (!existsSync("crates/replay_parser/pkg/replay_parser.js")) {
    writeFileSync(
      "crates/replay_parser/pkg/replay_parser.js",
      "export default async function init() {}\n",
      "utf8"
    );
  }
}
