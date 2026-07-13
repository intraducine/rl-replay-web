import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("generic boost render contract", () => {
  it("keeps each car boost to two combined geometry draws", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(source).toContain("export const GENERIC_CAR_BOOST_DRAW_CALLS = 2");
    expect(source).toContain("mergeGeometries");
    expect(source).toContain("BOOST_OUTER_GEOMETRY");
    expect(source).toContain("BOOST_CORE_GEOMETRY");
    expect(source).not.toContain("useGLTF(ALPHA_BOOST");
    expect(source).not.toContain("Raycaster");
    expect(source).not.toContain("lensFlare");
    expect(source).not.toContain("pointLight");
  });

  it("uses geometry and the shared glow shader instead of source textures", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const visualSource = readFileSync(resolve(process.cwd(), "src/viewer/boostVisuals.ts"), "utf8");

    expect(carSource).toContain("createTwinPlumeGeometry");
    expect(carSource).toContain("createBoostPlumeMaterial");
    expect(carSource).toContain("ROCKET_LEAGUE_BLOOM_LAYER");
    expect(visualSource).toContain("THREE.AdditiveBlending");
    expect(visualSource).toContain("float upwardFade = pow(1.0 - vTrail");
    expect(carSource).not.toContain("alphaBoostConfig");
    expect(carSource).not.toContain("alphaBoostMaterial");
    expect(carSource).not.toContain("alpha-boost/");
  });

  it("animates deterministically from replay time without sampling particle windows", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const sceneSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneSource).toContain("carBoostSegmentAt(timeline, id, time)");
    expect(sceneSource).toContain("setCarBoostActive(group, boosting, frame, boostRenderingEnabled, time)");
    expect(sceneSource).not.toContain("sampleCarDistanceAndSpawnPerUnitAgesWindow");
    expect(sceneSource).not.toContain("alphaBoostFlameWindow");
    expect(carSource).toContain("root.userData.boostTime");
    expect(carSource).toContain("outerMaterial.uniforms.uTime.value = replayTime");
  });
});
