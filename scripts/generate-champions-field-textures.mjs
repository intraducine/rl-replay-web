import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_ROCKET_LEAGUE_ROOT =
  "/Users/viburamineni/Library/Application Support/CrossOver/Bottles/Rocket League/drive_c/Program Files/Epic Games/rocketleague";
const DEFAULT_UMODEL_EXPORT_ROOT = "/Users/viburamineni/RocketLeagueMapExtract/output/ChampionsField_umodel";
const DEFAULT_UMODEL_TOOL = "/Users/viburamineni/RocketLeagueMapExtract/tools/umodel/umodel_64.exe";
const rocketLeagueRoot = process.env.ROCKET_LEAGUE_ROOT ?? DEFAULT_ROCKET_LEAGUE_ROOT;
const umodelExportRoot = process.env.CHAMPIONS_FIELD_UMODEL_EXPORT_ROOT ?? DEFAULT_UMODEL_EXPORT_ROOT;
const umodelTool = process.env.UMODEL_TOOL ?? DEFAULT_UMODEL_TOOL;
const cookedRoot = resolve(rocketLeagueRoot, "TAGame/CookedPCConsole");
const outRoot = "public/rl-assets/champions-field-scraped";
const importableManifestPath = "src/viewer/generated/championsFieldTextureManifest.json";

const textureSpecs = {
  fieldGrass: {
    output: "field-grass-pattern.png",
    package: "CS_Field.upk",
    extractedTexture: "CS_FieldAssets01/Texture2D/CS_FieldGrassPattern_Half_D.dds",
    materialProps: "CS_FieldAssets01/MaterialInstanceConstant/CS_Grass_Base_V2_MIC.props.txt",
    mode: "fieldSurface"
  },
  stadiumTrim: {
    output: "stadium-trim-01-albedo.png",
    package: "CS_Field.upk",
    extractedTexture: "CS_StadiumAssets_01/Texture2D/CS_Trim_01_D.dds",
    materialProps: "CS_StadiumAssets_01/MaterialInstanceConstant/MIC_CS_GC_Trim01.props.txt",
    mode: "materialGradient"
  },
  stadiumWallMetal: {
    output: "stadium-wall-metal-02-albedo.png",
    package: "CS_P.upk",
    extractedTexture: "CS_StadiumAssets_01/Texture2D/CS_WallMetal_02_D.dds",
    materialProps: "CS_StadiumAssets_01/MaterialInstanceConstant/MIC_CS_WallMetal02.props.txt",
    mode: "materialGradient"
  },
  bannerPack: {
    output: "banner-pack.png",
    package: "CS_OOB.upk",
    extractedTexture: "SS_OOB/Texture2D/RLCS_WinnerBanners_01_D.dds",
    materialProps: "SS_OOB/Material3/CS_OOB_RLCS_Mat.props.txt",
    mode: "direct"
  },
  countryFlags: {
    output: "country-flags.png",
    package: "CS_Lights.upk",
    extractedTexture: "Stadium_CountryFlags_Textures/Texture2D/CountryFlagsCombined.dds",
    materialProps: "SS_OOB/Material3/CS_OOB_CountryFlags_Mat.props.txt",
    mode: "direct"
  },
  buildingPack: {
    output: "building-pack.png",
    package: "CS_OOB.upk",
    extractedTexture: "City_Textures/Texture2D/Building_A_Pack.tga",
    materialProps: "City/MaterialInstanceConstant/Building_MIC.props.txt",
    mode: "direct"
  },
  windowBarred: {
    output: "window-barred-pack.png",
    package: "CS_OOB.upk",
    extractedTexture: "City_Textures/Texture2D/Window_Barred_Pack.dds",
    materialProps: "City/MaterialInstanceConstant/Window_Barred_Team1_MIC.props.txt",
    mode: "direct"
  },
  tentFabric: {
    output: "tent-fabric.png",
    package: "CS_OOB2.upk",
    extractedTexture: "SS_OOB/Texture2D/CS_TentFabric_D.dds",
    materialProps: "SS_OOB/Material3/CS_TentFabric_Mat.props.txt",
    mode: "direct"
  },
  advertStrip: {
    output: "advert-strip.png",
    package: "CS_OOB2.upk",
    extractedTexture: "Adverts_Textures/Texture2D/Advert_Strip.dds",
    materialProps: "Adverts/MaterialInstanceConstant/4x1_A_MIC.props.txt",
    mode: "direct"
  },
  stairsPack: {
    output: "stairs-pack.png",
    package: "CS_Grounds.upk",
    extractedTexture: "Stadium_Textures/Texture2D/Stairs_Pack.tga",
    materialProps: "SS_OOB/Material3/CS_Stairs_Mat.props.txt",
    mode: "neutralAlbedo"
  },
  handrail: {
    output: "handrail.png",
    package: "CS_OOB2.upk",
    extractedTexture: "Stadium_Textures/Texture2D/HandRail_D.dds",
    materialProps: "Stadium/Material3/HandRail_Mat.props.txt",
    mode: "direct"
  }
};

mkdirSync(outRoot, { recursive: true });

const manifest = {
  generatedBy: "scripts/generate-champions-field-textures.mjs",
  rocketLeagueRoot,
  umodelExportRoot,
  umodelTool,
  textures: {}
};

for (const [name, spec] of Object.entries(textureSpecs)) {
  const sourcePath = resolve(umodelExportRoot, spec.extractedTexture);
  const packageFile = resolve(cookedRoot, spec.package);
  const materialProps = spec.materialProps ? resolve(umodelExportRoot, spec.materialProps) : undefined;
  const outPath = resolve(outRoot, spec.output);

  assertExists(umodelExportRoot, "UModel Champions Field export root");
  assertExists(umodelTool, "UModel executable");
  assertExists(sourcePath, `${name} extracted texture`);
  assertExists(packageFile, `${name} Rocket League package`);
  if (materialProps) assertExists(materialProps, `${name} material props`);

  mkdirSync(dirname(outPath), { recursive: true });
  generateTexture(spec.mode, sourcePath, outPath, materialProps);

  manifest.textures[name] = {
    browserPath: `/rl-assets/champions-field-scraped/${spec.output}`,
    packageFile,
    extractedTexture: sourcePath,
    ...(spec.materialProps ? { materialProps } : {})
  };
}

writeManifest(resolve(outRoot, "manifest.json"), manifest);
writeManifest(importableManifestPath, manifest);

function generateTexture(mode, sourcePath, outPath, materialProps) {
  if (mode === "direct") {
    magick(sourcePath, "-alpha", "off", "-strip", outPath);
    return;
  }

  if (mode === "normalize") {
    magick(sourcePath, "-alpha", "off", "-blur", "0x32", "-modulate", "92,120,100", "-strip", outPath);
    return;
  }

  if (mode === "fieldSurface") {
    magick(
      sourcePath,
      "-alpha",
      "off",
      "-crop",
      "1269x978+389+46",
      "+repage",
      "-resize",
      "2048x",
      "(",
      "+clone",
      "-flip",
      ")",
      "-append",
      "-strip",
      outPath
    );
    return;
  }

  if (mode === "neutralAlbedo") {
    magick(sourcePath, "-alpha", "off", "-colorspace", "Gray", "-auto-level", "+level-colors", "#4c4c48,#aaa79b", "-strip", outPath);
    return;
  }

  if (mode === "materialGradient") {
    const props = readFileSync(materialProps, "utf8");
    const primary = vectorParameterToHex(props, "Color");
    const secondary = vectorParameterToHex(props, "Color_Secondary") ?? primary;
    if (!primary) throw new Error(`Material color parameter not found in ${materialProps}`);
    magick(sourcePath, "-alpha", "off", "-colorspace", "Gray", "-auto-level", "+level-colors", `${secondary},${primary}`, "-strip", outPath);
    return;
  }

  throw new Error(`Unknown texture generation mode: ${mode}`);
}

function vectorParameterToHex(props, parameterName) {
  const pattern = new RegExp(
    `ParameterValue\\s*=\\s*\\{\\s*R=([0-9.\\-]+),\\s*G=([0-9.\\-]+),\\s*B=([0-9.\\-]+),\\s*A=[0-9.\\-]+\\s*\\}[\\s\\S]{0,160}?ParameterName\\s*=\\s*${parameterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "m"
  );
  const match = props.match(pattern);
  if (!match) return undefined;

  return `#${match
    .slice(1, 4)
    .map((channel) => {
      const value = Math.max(0, Math.min(255, Math.round(Number(channel) * 255)));
      return value.toString(16).padStart(2, "0");
    })
    .join("")}`;
}

function assertExists(path, label) {
  if (!existsSync(path)) throw new Error(`${label} is missing: ${path}`);
}

function writeManifest(path, manifest) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

function magick(...args) {
  execFileSync("magick", args, { stdio: "inherit" });
}
