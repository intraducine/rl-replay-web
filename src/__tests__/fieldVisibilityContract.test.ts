import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("field visibility contract", () => {
  it("uses the authored field atlas markings instead of a separate misaligned decal", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(championsFieldSource).not.toContain("FIELD_MARKING_HEIGHT");
    expect(championsFieldSource).not.toContain("FieldMarkingDecal");
    expect(championsFieldSource).not.toContain("createFieldMarkingTexture");
    expect(championsFieldSource).not.toContain("strokeStyle = \"rgba(245, 247, 239");
    expect(championsFieldSource).not.toContain("polygonOffsetFactor");
  });

  it("uses shadow maps plus a yaw-aligned projected vehicle silhouette instead of a fixed unrotated blob", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    const lightingSource = readFileSync(resolve(process.cwd(), "src/viewer/RocketLeagueLighting.tsx"), "utf8");

    expect(sceneRootSource).toContain("<Canvas");
    expect(sceneRootSource).toContain("shadows");
    expect(lightingSource).toContain("castShadow");
    expect(lightingSource).toContain("shadow-mapSize-width");
    expect(sceneRootSource).toContain("FieldShadowCatcher");
    expect(sceneRootSource).toContain("<shadowMaterial");
    expect(sceneRootSource).toContain("ProjectedCarShadow");
    expect(sceneRootSource).toContain("createProjectedCarShadowTexture");
    expect(sceneRootSource).toContain("shadow.rotation.set(0, SHADOW_EULER.y, 0)");
    expect(sceneRootSource).not.toContain("CarGroundShadow");
    expect(sceneRootSource).not.toContain("setGroundShadow(shadow, frame.position[0], frame.position[2], 340, 190, 0.34)");
  });
});
