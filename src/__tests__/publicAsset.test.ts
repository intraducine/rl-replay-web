import { describe, expect, it } from "vitest";
import { publicAssetWithBase } from "../viewer/publicAsset";
import { SAMPLE_REPLAY_PATH, sampleReplayUrlWithBase } from "../replay/sampleReplay";

describe("public asset URLs", () => {
  it("keeps root-hosted public assets unchanged in local development", () => {
    expect(publicAssetWithBase("/rl-assets/ball/Ball_DefaultBall00.gltf", "/")).toBe("/rl-assets/ball/Ball_DefaultBall00.gltf");
  });

  it("prefixes public assets with the GitHub Pages base path", () => {
    expect(publicAssetWithBase("/rl-assets/ball/Ball_DefaultBall00.gltf", "/rl-replay-web/")).toBe(
      "/rl-replay-web/rl-assets/ball/Ball_DefaultBall00.gltf"
    );
  });

  it("builds a base-path-safe sample replay URL", () => {
    expect(SAMPLE_REPLAY_PATH).toBe("/sample-replays/cd2c5d33-422a-4d11-b6ca-9d827c5d26fe.replay");
    expect(sampleReplayUrlWithBase("/rl-replay-web/")).toBe(
      "/rl-replay-web/sample-replays/cd2c5d33-422a-4d11-b6ca-9d827c5d26fe.replay"
    );
  });
});
