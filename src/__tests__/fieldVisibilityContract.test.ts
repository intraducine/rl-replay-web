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
    expect(sceneRootSource).toContain("const PROJECTED_SHADOW_BASE_OPACITY = 0.28");
    expect(sceneRootSource).toContain("PROJECTED_SHADOW_Y = FIELD_SHADOW_CATCHER_Y + 0.6");
    expect(sceneRootSource).not.toContain("CarGroundShadow");
    expect(sceneRootSource).not.toContain("setGroundShadow(shadow, frame.position[0], frame.position[2], 340, 190, 0.34)");
  });

  it("uses a shared visual ground offset for initial and animated car placement", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    const placementSource = readFileSync(resolve(process.cwd(), "src/viewer/carPlacement.ts"), "utf8");

    expect(placementSource).toContain("CAR_VISUAL_GROUND_OFFSET_Y = -34");
    expect(placementSource).toContain("setCarRenderPosition");
    expect(carSource).toContain("carRenderPosition(frame.position)");
    expect(sceneRootSource).toContain("setCarRenderPosition(group.position, frame.position)");
    expect(sceneRootSource).toContain("setCarRenderPosition(SHADOW_RENDER_POSITION, frame.position)");
    expect(sceneRootSource).not.toContain("group.position.fromArray(carRenderPosition(frame.position))");
    expect(sceneRootSource).not.toContain("const renderPosition = carRenderPosition(frame.position)");
  });
});
