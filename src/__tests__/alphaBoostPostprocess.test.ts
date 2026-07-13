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

  it("uses SMAA without multisampling half-float composer targets", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain('import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js"');
    expect(sceneRootSource).toContain("nextFinalComposer.addPass(nextSmaaPass)");
    expect(sceneRootSource).toContain("smaaPass.dispose()");
    expect(sceneRootSource).not.toContain("renderTarget1.samples");
    expect(sceneRootSource).not.toContain("renderTarget2.samples");
    expect(sceneRootSource).toContain("dpr={[1, 2]}");
  });
});
