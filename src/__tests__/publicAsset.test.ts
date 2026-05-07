import { describe, expect, it } from "vitest";
import { publicAssetWithBase } from "../viewer/publicAsset";

describe("public asset URLs", () => {
  it("keeps root-hosted public assets unchanged in local development", () => {
    expect(publicAssetWithBase("/rl-assets/ball/Ball_DefaultBall00.gltf", "/")).toBe("/rl-assets/ball/Ball_DefaultBall00.gltf");
  });

  it("prefixes public assets with the GitHub Pages base path", () => {
    expect(publicAssetWithBase("/rl-assets/ball/Ball_DefaultBall00.gltf", "/rl-replay-web/")).toBe(
      "/rl-replay-web/rl-assets/ball/Ball_DefaultBall00.gltf"
    );
  });
});
