import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type ScrapedTextureManifest = {
  rocketLeagueRoot: string;
  umodelExportRoot: string;
  umodelTool: string;
  generatedBy: string;
  textures: Record<
    string,
    {
      browserPath: string;
      packageFile: string;
      extractedTexture: string;
      materialProps?: string;
    }
  >;
};

describe("Champions Field color contract", () => {
  it("uses browser-ready textures derived from the extracted Champions Field packages", () => {
    const derivedRoot = resolve(process.cwd(), "public/rl-assets/champions-field-scraped");

    [
      "field-grass-pattern.png",
      "stadium-trim-01-albedo.png",
      "stadium-wall-metal-02-albedo.png",
      "banner-pack.png",
      "country-flags.png",
      "building-pack.png",
      "window-barred-pack.png",
      "tent-fabric.png",
      "advert-strip.png",
      "stairs-pack.png",
      "handrail.png"
    ].forEach((fileName) => {
      expect(existsSync(resolve(derivedRoot, fileName)), `${fileName} is missing`).toBe(true);
    });
  });

  it("keeps provenance back to the Rocket League install packages", () => {
    const manifestPath = resolve(process.cwd(), "public/rl-assets/champions-field-scraped/manifest.json");
    const importableManifestPath = resolve(process.cwd(), "src/viewer/generated/championsFieldTextureManifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ScrapedTextureManifest;
    const importableManifest = JSON.parse(readFileSync(importableManifestPath, "utf8")) as ScrapedTextureManifest;
    const verifyLocalSourceAssets = process.env.VERIFY_LOCAL_RL_ASSETS === "1";

    expect(manifest.generatedBy).toBe("scripts/generate-champions-field-textures.mjs");
    expect(importableManifest).toEqual(manifest);
    expect(manifest.rocketLeagueRoot).toContain("Epic Games/rocketleague");
    expect(manifest.umodelExportRoot).toContain("RocketLeagueMapExtract/output/ChampionsField_umodel");
    expect(manifest.umodelTool).toContain("RocketLeagueMapExtract/tools/umodel/umodel_64.exe");
    if (verifyLocalSourceAssets) {
      expect(existsSync(manifest.umodelExportRoot), "UModel export root exists").toBe(true);
      expect(existsSync(manifest.umodelTool), "UModel tool exists").toBe(true);
    }
    expect(Object.keys(manifest.textures).sort()).toEqual(
      [
        "advertStrip",
        "bannerPack",
        "buildingPack",
        "countryFlags",
        "fieldGrass",
        "handrail",
        "stadiumTrim",
        "stadiumWallMetal",
        "stairsPack",
        "tentFabric",
        "windowBarred"
      ].sort()
    );

    for (const [name, texture] of Object.entries(manifest.textures)) {
      expect(texture.browserPath, `${name} browser path`).toContain("/rl-assets/champions-field-scraped/");
      expect(texture.packageFile, `${name} package provenance`).toMatch(/TAGame\/CookedPCConsole\/.+\.upk$/);
      expect(texture.extractedTexture, `${name} UModel texture`).toContain("RocketLeagueMapExtract/output/ChampionsField_umodel/");
      if (verifyLocalSourceAssets) {
        expect(existsSync(texture.packageFile), `${name} package exists`).toBe(true);
        expect(existsSync(texture.extractedTexture), `${name} UModel texture exists`).toBe(true);
      }
    }
  });

  it("uses scraped texture maps instead of guessed color swatches", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(championsFieldSource).toContain("CHAMPIONS_FIELD_TEXTURES");
    expect(championsFieldSource).toContain("championsFieldTextureManifest");
    expect(championsFieldSource).toContain("./generated/championsFieldTextureManifest.json");
    expect(championsFieldSource).not.toContain("../../public/rl-assets/champions-field-scraped/manifest.json");
    expect(championsFieldSource).toContain("texture.flipY = false");
    expect(championsFieldSource).toContain("createTextureBackedMaterials");
    expect(championsFieldSource).toContain("stadiumTrim");
    expect(championsFieldSource).toContain("stadiumWallMetal");
    expect(championsFieldSource).toContain("map: textures.stadiumTrim");
    expect(championsFieldSource).toContain("map: textures.stadiumWallMetal");
    expect(championsFieldSource).toContain("map: textures.stairsPack");
    expect(championsFieldSource).toContain("countryFlags");
    expect(championsFieldSource).toContain("advertStrip");
    expect(championsFieldSource).toContain("CS_TunnelBanners|CS_CountryFlags");
    expect(championsFieldSource).toContain("CS_SeparatedAds");
    expect(championsFieldSource).toContain("CS_FieldLightTrim|CS_CornerArrows");
    expect(championsFieldSource).not.toContain("CHAMPIONS_FIELD_SOURCE_COLORS");
    expect(championsFieldSource).not.toContain("#7e6bd2");
    expect(championsFieldSource).not.toContain("#6c4083");
    expect(championsFieldSource).not.toContain("color: \"#c95c2f\"");
  });

  it("uses a full-field surface texture so the grass texture is not stretched", () => {
    const derivedRoot = resolve(process.cwd(), "public/rl-assets/champions-field-scraped");
    const fieldGeometry = identifyGeometry(resolve(derivedRoot, "field-grass-pattern.png"));
    const manifest = JSON.parse(readFileSync(resolve(derivedRoot, "manifest.json"), "utf8")) as ScrapedTextureManifest;
    const trimAverage = averageRgb(resolve(derivedRoot, "stadium-trim-01-albedo.png"));
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(fieldGeometry).toBe("2048x3156");
    expect(manifest.textures.fieldGrass.extractedTexture).toContain("CS_FieldGrassPattern_Half_D.dds");
    expect(championsFieldSource).toContain("<FieldSurfacePlane texture={textures.fieldGrass} />");
    expect(championsFieldSource).toContain("FIELD_SURFACE_WIDTH = 76.45");
    expect(championsFieldSource).toContain("FIELD_SURFACE_LENGTH = 117.75");
    expect(championsFieldSource).toContain("HIDDEN_FIELD_SURFACE_MESH");
    expect(championsFieldSource).not.toContain('if (name === "fieldGrass") texture.repeat.set(6, 6);');
    expect(maxChannelDelta(trimAverage), `trim average is too gray: ${trimAverage.join(",")}`).toBeGreaterThanOrEqual(70);
    expect(championsFieldSource).toContain("emissiveIntensity: 0.24");
    expect(championsFieldSource).not.toContain("oobCrowd: new THREE.MeshStandardMaterial({\n      map: textures.stadiumTrim");
    expect(championsFieldSource).toContain("if (/CS_Stands|CS_Crowd|Crowd/i.test(meshName)) return materials.oobCrowd;");
    expect(championsFieldSource).toContain("if (/CS_FieldLightTrim|CS_CornerArrows/i.test(meshName)) return fieldAccentMaterialForMesh(object, materials);");
  });

  it("scales the authored field surface to the standard large boost pad landmarks", () => {
    const scriptSource = readFileSync(resolve(process.cwd(), "scripts/generate-champions-field-textures.mjs"), "utf8");
    const fieldSurfaceWidth = 7645;
    const fieldSurfaceLength = 11775;
    const textureWidth = 2048;
    const textureLength = 3156;
    const largeBoostLandmarks = [
      { pixel: [201.3, 479.7], world: [-3072, -4096] },
      { pixel: [1847.2, 479.7], world: [3072, -4096] },
      { pixel: [65.8, 1577.5], world: [-3584, 0] },
      { pixel: [1982.9, 1577.5], world: [3584, 0] },
      { pixel: [201.3, 2675.3], world: [-3072, 4096] },
      { pixel: [1847.2, 2675.3], world: [3072, 4096] }
    ];

    expect(scriptSource).toContain("1269x978+389+46");
    expect(scriptSource).toContain("2048x");

    for (const { pixel, world } of largeBoostLandmarks) {
      const mappedX = (pixel[0] / textureWidth - 0.5) * fieldSurfaceWidth;
      const mappedY = (pixel[1] / textureLength - 0.5) * fieldSurfaceLength;
      expect(Math.abs(mappedX - world[0])).toBeLessThan(16);
      expect(Math.abs(mappedY - world[1])).toBeLessThan(16);
    }
  });

  it("colors the two goal nets by their field side instead of using one gray material", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(championsFieldSource).toContain("blueGoal: new THREE.MeshStandardMaterial");
    expect(championsFieldSource).toContain("orangeGoal: new THREE.MeshStandardMaterial");
    expect(championsFieldSource).toContain("map: textures.stadiumWallMetal");
    expect(championsFieldSource).toContain("emissiveMap: textures.stadiumWallMetal");
    expect(championsFieldSource).toContain('emissive: "#0066ff"');
    expect(championsFieldSource).toContain('emissive: "#ff4a00"');
    expect(championsFieldSource).toContain("emissiveIntensity: 0.62");
    expect(championsFieldSource).toContain("goalMaterialForMesh(object, materials)");
    expect(championsFieldSource).toContain("fieldAccentMaterialForMesh(object, materials)");
    expect(championsFieldSource).toContain("GOAL_MESH_BOX.setFromObject(object)");
    expect(championsFieldSource).toContain("meshCenterZ(object) >= 0 ? materials.blueGoal : materials.orangeGoal");
    expect(championsFieldSource).toContain("meshCenterZ(object) >= 0 ? materials.blueFieldAccent : materials.orangeFieldAccent");
    expect(championsFieldSource).toContain("blueFieldAccent: new THREE.MeshBasicMaterial");
    expect(championsFieldSource).toContain("orangeFieldAccent: new THREE.MeshBasicMaterial");
    expect(championsFieldSource).toContain("blending: THREE.AdditiveBlending");
    expect(championsFieldSource).toContain("toneMapped: false");
    expect(championsFieldSource).not.toContain("if (/Goal/i.test(meshName)) return materials.goal;");
    expect(championsFieldSource).not.toContain("return materials.teamAccent.clone();");
  });
});

function identifyGeometry(path: string) {
  return execFileSync("magick", ["identify", "-format", "%wx%h", path], { encoding: "utf8" });
}

function averageRgb(path: string) {
  const pixel = execFileSync("magick", [path, "-resize", "1x1!", "txt:-"], { encoding: "utf8" })
    .split("\n")
    .find((line) => line.includes("srgb("));
  if (!pixel) throw new Error(`Unable to read average pixel for ${path}`);
  const rgb = pixel.match(/\((\d+),(\d+),(\d+)\)/);
  if (!rgb) throw new Error(`Unable to parse average pixel for ${path}: ${pixel}`);
  return rgb.slice(1).map(Number);
}

function maxChannelDelta([r, g, b]: number[]) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}
