import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

type TextureManifest = {
  rocketLeagueRoot: string;
  umodelExportRoot: string;
  umodelTool: string;
  generatedBy: string;
  textures: Record<string, { browserPath: string; packageFile: string; extractedTexture: string }>;
};

describe("Champions Field material contract", () => {
  it("keeps browser-ready field textures derived from the extracted packages", () => {
    const root = resolve(process.cwd(), "public/rl-assets/champions-field-scraped");
    for (const name of ["field-grass-pattern.png", "stadium-trim-01-albedo.png", "stadium-wall-metal-02-albedo.png"]) {
      expect(existsSync(resolve(root, name)), `${name} is missing`).toBe(true);
    }
  });

  it("keeps provenance back to the user's Rocket League install", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "public/rl-assets/champions-field-scraped/manifest.json"), "utf8")) as TextureManifest;
    expect(manifest.generatedBy).toBe("scripts/generate-champions-field-textures.mjs");
    expect(manifest.rocketLeagueRoot).toContain("Epic Games/rocketleague");
    expect(manifest.umodelExportRoot).toContain("RocketLeagueMapExtract/output/ChampionsField_umodel");
    expect(manifest.umodelTool).toContain("RocketLeagueMapExtract/tools/umodel/umodel_64.exe");
    expect(manifest.textures.fieldGrass.extractedTexture).toContain("CS_FieldGrassPattern_Half_D.dds");
  });

  it("maps the full-field texture exactly once across the regulation pitch", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    const image = PNG.sync.read(readFileSync(resolve(process.cwd(), "public/rl-assets/champions-field-scraped/field-grass-pattern.png")));

    expect(`${image.width}x${image.height}`).toBe("2048x3156");
    expect(source).toContain("FIELD_GRASS_TEXTURE");
    expect(source).toContain("championsFieldTextureManifest.textures.fieldGrass.browserPath");
    expect(source).toContain("FIELD_SURFACE_WIDTH = 76.45");
    expect(source).toContain("FIELD_SURFACE_LENGTH = 117.75");
    expect(source).toContain("wrapS = clamp ? THREE.ClampToEdgeWrapping");
    expect(source).toContain("texture.flipY = false");
  });

  it("colors authored goals and trim by field side", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    expect(source).toContain("TEAM_COLORS");
    expect(source).toContain('blueGoal: createTeamMaterial("blue", textures.wallDetail)');
    expect(source).toContain('orangeGoal: createTeamMaterial("orange", textures.wallDetail)');
    expect(source).toContain('blueGoalNet: createTeamNetMaterial("blue")');
    expect(source).toContain('orangeGoalNet: createTeamNetMaterial("orange")');
    expect(source).toContain("teamMaterialForMesh(mesh, materials.blueGoal, materials.orangeGoal)");
    expect(source).toContain("teamMaterialForMesh(mesh, materials.blueGoalNet, materials.orangeGoalNet)");
    expect(source).toContain("MESH_WORLD_BOX.setFromObject(mesh)");
    expect(source).toContain("MESH_WORLD_CENTER.z >= 0 ? blue : orange");
  });
});
