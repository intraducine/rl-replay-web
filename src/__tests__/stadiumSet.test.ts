import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Rocket League Champions Field arena contract", () => {
  it("uses the extracted Champions Field arena instead of procedural geometry", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/StandardArena.tsx"), "utf8");
    expect(source).toContain("<ChampionsFieldStadium />");
    expect(source).not.toContain("<StadiumBowl />");
    expect(source).not.toContain("<StadiumShell />");
  });

  it("builds compact field-only GLBs from the placed Rocket League packages", () => {
    const script = readFileSync(resolve(process.cwd(), "scripts/build-champions-field-arena.mjs"), "utf8");
    const playable = resolve(process.cwd(), "public/rl-assets/champions-field-arena/champions-field-playable.glb");
    const boundary = resolve(process.cwd(), "public/rl-assets/champions-field-arena/champions-field-boundary.glb");

    expect(existsSync(playable)).toBe(true);
    expect(existsSync(boundary)).toBe(true);
    expect(statSync(playable).size + statSync(boundary).size).toBeLessThan(3 * 1024 * 1024);
    expect(script).toContain('input: "CS_Field_combined.gltf"');
    expect(script).toContain('input: "CS_P_combined.gltf"');
    expect(script).toContain('"CS_FieldGoalInner_02"');
    expect(script).toContain('"CS_FieldGoalOuter_01"');
    expect(script).not.toContain('"CS_Stands_00"');
    expect(script).not.toContain('"CS_Crowd_Final_01"');
    expect(script).not.toContain('"City_OOB_A"');
  });

  it("loads the compact playable arena plus broadcast backdrop assets at runtime", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(source).toContain("CHAMPIONS_FIELD_PLAYABLE_SCENE");
    expect(source).toContain("CHAMPIONS_FIELD_BOUNDARY_SCENE");
    expect(source).toContain("CHAMPIONS_FIELD_ARENA_SCENES");
    expect(source).toContain("CHAMPIONS_FIELD_BROADCAST_BACKDROP_SCENES");
    expect(source).toContain("CS_OOB2_combined.gltf");
    expect(source).toContain("CS_Lights_combined.gltf");
    expect(source).not.toContain("CS_OOB_combined.gltf");
    expect(source).not.toContain("CS_Grounds_combined.gltf");
    expect(source).not.toMatch(/Crowd|City_OOB|SkyDome/);
    expect(source).toContain("materialForBackdropMesh");
  });

  it("uses one textured turf surface and no overlapping shadow catcher", () => {
    const arena = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    const scene = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(arena).toContain('name="champions-field-authored-turf"');
    expect(arena).toContain("FIELD_SURFACE_WIDTH = 76.45");
    expect(arena).toContain("FIELD_SURFACE_LENGTH = 117.75");
    expect(arena).toContain("polygonOffsetFactor = 1");
    expect(arena).not.toContain("FieldMarkings");
    expect(scene).not.toContain("FieldShadowCatcher");
    expect(scene).not.toContain("<shadowMaterial");
  });

  it("renders the cage transparently without writing competing depth", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    expect(source).toContain('name: "champions-field-cage"');
    expect(source).toContain("transmission: 0.72");
    expect(source).toContain("depthWrite: false");
    expect(source).toContain("polygonOffsetFactor: -2");
    expect(source).toContain("/WallsGlass|FieldHexShell/i");
  });

  it("keeps full extraction provenance without rendering the full stadium", async () => {
    const assets = await import("../viewer/championsFieldAssets");
    expect(assets.CHAMPIONS_FIELD_ASSET_ROOT).toBe("/rl-assets/champions-field-full");
    expect(assets.CHAMPIONS_FIELD_ASSETS.some((asset) => asset.path === "CS_FieldAssets01/StaticMesh3/CS_FieldWallsRL_02.gltf")).toBe(true);
    expect(assets.CHAMPIONS_FIELD_ASSETS.some((asset) => asset.path === "CS_StadiumAssets_01/StaticMesh3/CS_Stands_00.gltf")).toBe(true);
  });

  it("does not add the scene background into the bloom overlay", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    expect(source).toContain("const previousBackground = scene.background");
    expect(source).toContain("scene.background = null");
    expect(source).toContain("scene.background = previousBackground");
  });
});
