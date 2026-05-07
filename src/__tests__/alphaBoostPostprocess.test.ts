import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Rocket League postprocess contract", () => {
  it("renders the scene through Unreal-style bloom for emissive alpha boost particles", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("UnrealBloomPass");
    expect(sceneRootSource).toContain("EffectComposer");
    expect(sceneRootSource).toContain("RocketLeaguePostprocess");
    expect(sceneRootSource).toContain("ROCKET_LEAGUE_BLOOM_LAYER");
    expect(sceneRootSource).toContain("bloomComposer.render()");
    expect(sceneRootSource).toContain("finalComposer.render()");
  });

  it("keeps renderer output in half float so bloom sees HDR alpha boost energy", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("outputBufferType: THREE.HalfFloatType");
  });
});
