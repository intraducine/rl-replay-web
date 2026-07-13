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

  it("contains only playable-enclosure nodes in the runtime GLBs", async () => {
    const { NodeIO } = await import("@gltf-transform/core");
    const allowedNodes = new Set([
      "CS_FieldHexShell_01",
      "CS_FieldWallsRL_02",
      "CS_FieldWallsGlass_01",
      "CS_FieldClampsCombined_01a",
      "CS_FieldLightTrim_01",
      "CS_Lattice_01",
      "CS_FieldGoalInner_02",
      "CS_FieldGoalInner_03",
      "CS_FieldLightsCombined_01",
      "CS_FieldWalls_01",
      "CS_FieldGoalOuter_01",
      "CS_CornerArrows"
    ]);
    const runtimeFiles = [
      resolve(process.cwd(), "public/rl-assets/champions-field-arena/champions-field-playable.glb"),
      resolve(process.cwd(), "public/rl-assets/champions-field-arena/champions-field-boundary.glb")
    ];
    const runtimeNodeNames: string[] = [];

    for (const file of runtimeFiles) {
      const document = await new NodeIO().read(file);
      runtimeNodeNames.push(...document.getRoot().listNodes().filter((node) => node.getMesh()).map((node) => node.getName()));
    }

    expect(runtimeNodeNames.length).toBeGreaterThan(0);
    expect(runtimeNodeNames.every((name) => allowedNodes.has(name))).toBe(true);
    expect(runtimeNodeNames.join(" ")).not.toMatch(/Stands|Crowd|City|Tent|Blimp|Tifo|Banner|Statue|Sky/i);
  });

  it("loads only the compact playable enclosure at runtime", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(source).toContain("CHAMPIONS_FIELD_PLAYABLE_SCENE");
    expect(source).toContain("CHAMPIONS_FIELD_BOUNDARY_SCENE");
    expect(source).toContain("CHAMPIONS_FIELD_ARENA_SCENES");
    expect(source).not.toContain("CHAMPIONS_FIELD_BROADCAST_BACKDROP_SCENES");
    expect(source).not.toContain("champions-field-placed");
    expect(source).not.toContain("CS_OOB2_combined.gltf");
    expect(source).not.toContain("CS_Lights_combined.gltf");
    expect(source).not.toContain("CS_OOB_combined.gltf");
    expect(source).not.toContain("CS_Grounds_combined.gltf");
    expect(source).not.toMatch(/Crowd|City_OOB|SkyDome/);
    expect(source).not.toContain("materialForBackdropMesh");
    expect(source).not.toMatch(/broadcast-(?:backdrop|stands|handrail|adverts|banners|flags|tent)/);
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
    expect(source).toContain("transmission: 0");
    expect(source).toContain("opacity: 0.045");
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

  it("uses a bright atmospheric sky for the floating playable enclosure", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/RocketLeagueLighting.tsx"), "utf8");

    expect(source).toContain('FLOATING_ARENA_SKY_COLOR = "#78b9e8"');
    expect(source).toContain("<Sky");
    expect(source).toContain("rayleigh={2.8}");
    expect(source).toContain('<fog attach="fog"');
    expect(source).toContain("environmentIntensity={0.48}");
    expect(source).not.toContain("SKYBOX_BLUE");
  });

  it("splits the extracted multi-part arena into physical surface classes", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(source).toContain('name: "champions-field-rubberized-wall"');
    expect(source).toContain('name: "champions-field-painted-steel"');
    expect(source).toContain('name: "champions-field-structural-steel"');
    expect(source).toContain("materialSlot(sourceMaterial, index)");
    expect(source).toContain("slot === 0 ? materials.glass : materials.wall");
    expect(source).toContain("slot === 0 ? materials.structuralSteel : materials.neutralLight");
    expect(source).toContain("bumpMap: textures.wallDetail");
    expect(source).toContain("bumpMap: textures.trimDetail");
    expect(source).toContain("THREE.NoColorSpace");
    expect(source).toContain("texture.anisotropy = 16");
    expect(source).toContain("texture.minFilter = THREE.LinearMipmapLinearFilter");
  });
});
