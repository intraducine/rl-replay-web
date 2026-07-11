import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("field visibility contract", () => {
  it("renders one extracted full-field atlas without decal layers", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    expect(source).toContain("function FieldSurface");
    expect(source).toContain("<planeGeometry args={[FIELD_SURFACE_WIDTH, FIELD_SURFACE_LENGTH]} />");
    expect(source).not.toContain("FieldMarkingDecal");
    expect(source).not.toContain("FieldMarkings");
    expect(source).not.toContain("ringGeometry");
  });

  it("uses authored turf for real shadows plus a raised projected silhouette", () => {
    const scene = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    const arena = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    const lighting = readFileSync(resolve(process.cwd(), "src/viewer/RocketLeagueLighting.tsx"), "utf8");
    expect(scene).toContain("<Canvas");
    expect(scene).toContain("shadows");
    expect(lighting).toContain("castShadow");
    expect(arena).toContain("receiveShadow renderOrder={0}");
    expect(scene).toContain("ProjectedCarShadow");
    expect(scene).toContain("const PROJECTED_SHADOW_Y = 12");
    expect(scene).not.toContain("FieldShadowCatcher");
  });

  it("uses a shared visual ground offset for initial and animated cars", () => {
    const car = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const scene = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    const placement = readFileSync(resolve(process.cwd(), "src/viewer/carPlacement.ts"), "utf8");
    expect(placement).toContain("CAR_VISUAL_GROUND_OFFSET_Y = -34");
    expect(car).toContain("carRenderPosition(frame.position)");
    expect(scene).toContain("setCarRenderPosition(group.position, frame.position)");
    expect(scene).toContain("setCarRenderPosition(SHADOW_RENDER_POSITION, frame.position)");
  });
});
