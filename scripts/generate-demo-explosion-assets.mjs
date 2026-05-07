import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_ROCKET_LEAGUE_ROOT =
  "/Users/viburamineni/Library/Application Support/CrossOver/Bottles/Rocket League/drive_c/Program Files/Epic Games/rocketleague";
const DEFAULT_UMODEL_EXPORT_ROOT = "/Users/viburamineni/RocketLeagueMapExtract/output/DemoExplosion_umodel";
const rocketLeagueRoot = process.env.ROCKET_LEAGUE_ROOT ?? DEFAULT_ROCKET_LEAGUE_ROOT;
const umodelExportRoot = process.env.DEMO_EXPLOSION_UMODEL_EXPORT_ROOT ?? DEFAULT_UMODEL_EXPORT_ROOT;
const cookedRoot = resolve(rocketLeagueRoot, "TAGame/CookedPCConsole");
const sourcePackage = resolve(cookedRoot, "Explosion_Default_SF.upk");
const outRoot = "public/rl-assets/demo-explosion";
const importableManifestPath = "src/viewer/generated/demoExplosionAssetManifest.json";

const textureSpecs = {
  smoke: {
    output: "smoke-plume-01-pack.png",
    extractedTexture: "Explosion_Default_SF/Texture2D/Smoke_Plume_01_Pack.png",
    args: ["-strip"]
  },
  smokeNoise: {
    output: "noise-smoke-03-pack.png",
    extractedTexture: "Startup/Texture2D/Noise_Smoke_03_Pack.png",
    args: ["-strip"]
  },
  fire: {
    output: "noise-fire-02-pack.png",
    extractedTexture: "Startup/Texture2D/Noise_Fire_02_Pack.png",
    args: ["-strip"]
  },
  lightning: {
    output: "lightning-pack.png",
    extractedTexture: "Startup/Texture2D/Lightning_Pack.png",
    args: ["-resize", "1024x1024", "-strip"]
  },
  glow: {
    output: "gradient-circle-01.png",
    extractedTexture: "Startup/Texture2D/GradientCircle01.png",
    args: ["-strip"]
  }
};
const materialSpecs = {
  electricity: {
    exportName: "Electricity_Mat",
    materialProps: "Explosion_Default_SF/Material3/Electricity_Mat.props.txt"
  },
  glow: {
    exportName: "Glow02_Mat",
    materialProps: "Explosion_Default_SF/Material3/Glow02_Mat.props.txt"
  },
  smoke: {
    exportName: "Smoke_Explosion_Mat",
    materialProps: "Explosion_Default_SF/Material3/Smoke_Explosion_Mat.props.txt"
  },
  smokeTrail: {
    exportName: "SmokeTrail_Explosion_Mat",
    materialProps: "Explosion_Default_SF/Material3/SmokeTrail_Explosion_Mat.props.txt"
  }
};

assertExists(rocketLeagueRoot, "Rocket League install root");
assertExists(sourcePackage, "Rocket League default explosion package");
assertExists(umodelExportRoot, "UModel demo explosion export root");
mkdirSync(outRoot, { recursive: true });

const manifest = {
  generatedBy: "scripts/generate-demo-explosion-assets.mjs",
  rocketLeagueRoot,
  umodelExportRoot,
  sourcePackage,
  textures: {},
  materials: {}
};

for (const [name, spec] of Object.entries(textureSpecs)) {
  const sourcePath = resolve(umodelExportRoot, spec.extractedTexture);
  const outPath = resolve(outRoot, spec.output);
  assertExists(sourcePath, `${name} extracted texture`);
  mkdirSync(dirname(outPath), { recursive: true });
  magick(sourcePath, ...spec.args, outPath);
  manifest.textures[name] = {
    browserPath: `/rl-assets/demo-explosion/${spec.output}`,
    sourcePackage,
    extractedTexture: sourcePath
  };
}

for (const [name, spec] of Object.entries(materialSpecs)) {
  const materialProps = resolve(umodelExportRoot, spec.materialProps);
  assertExists(materialProps, `${name} material props`);
  const props = readFileSync(materialProps, "utf8");
  manifest.materials[name] = {
    exportName: spec.exportName,
    sourcePackage,
    materialProps,
    blendMode: materialBlendMode(props),
    referencedTextures: materialReferencedTextures(props)
  };
}

writeManifest(resolve(outRoot, "manifest.json"), manifest);
writeManifest(importableManifestPath, manifest);

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

function materialBlendMode(props) {
  return props.match(/BlendMode\s*=\s*(BLEND_[A-Za-z]+)/)?.[1];
}

function materialReferencedTextures(props) {
  return [...props.matchAll(/Texture2D'([^']+)'/g)].map((match) => match[1]);
}
