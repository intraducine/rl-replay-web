import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Rocket League stadium set contract", () => {
  it("uses the extracted Champions Field map package instead of the procedural bowl", () => {
    const standardArenaSource = readFileSync(resolve(process.cwd(), "src/viewer/StandardArena.tsx"), "utf8");

    expect(standardArenaSource).toContain("<ChampionsFieldStadium />");
    expect(standardArenaSource).not.toContain("<StadiumBowl />");
    expect(standardArenaSource).not.toContain("<StadiumShell />");
  });

  it("keeps the full exported Champions Field stadium and sky manifest as source assets", async () => {
    const assets = await import("../viewer/championsFieldAssets");

    expect(assets.CHAMPIONS_FIELD_ASSET_ROOT).toBe("/rl-assets/champions-field-full");
    expect(assets.CHAMPIONS_FIELD_ASSETS.length).toBeGreaterThanOrEqual(80);
    expect(assets.CHAMPIONS_FIELD_ASSETS.some((asset) => asset.path === "Proto_World01/StaticMesh3/SkyDome01.gltf")).toBe(true);
    expect(assets.CHAMPIONS_FIELD_ASSETS.some((asset) => asset.path === "CS_StadiumAssets_01/StaticMesh3/CS_Stands_00.gltf")).toBe(true);
    expect(assets.CHAMPIONS_FIELD_ASSETS.some((asset) => asset.path === "City/StaticMesh3/City_OOB_A.gltf")).toBe(true);
    expect(assets.CHAMPIONS_FIELD_ASSETS.some((asset) => asset.path === "CS_FieldAssets01/StaticMesh3/CS_FieldWallsRL_02.gltf")).toBe(true);
  });

  it("renders a placed Champions Field scene without world-space blue fog", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    const lightingSource = readFileSync(resolve(process.cwd(), "src/viewer/RocketLeagueLighting.tsx"), "utf8");

    expect(existsSync(resolve(process.cwd(), "public/rl-assets/champions-field-placed/CS_P_combined.gltf"))).toBe(true);
    expect(championsFieldSource).toContain("CHAMPIONS_FIELD_PLACED_SCENE");
    expect(championsFieldSource).toContain("CS_Field_combined.gltf");
    expect(championsFieldSource).toContain("CS_Grounds_combined.gltf");
    expect(championsFieldSource).toContain("CS_Lights_combined.gltf");
    expect(championsFieldSource).toContain("CS_OOB_combined.gltf");
    expect(championsFieldSource).toContain("CS_OOB2_combined.gltf");
    expect(championsFieldSource).toContain("HIDDEN_EFFECT_MESH");
    expect(championsFieldSource).toContain("SkyDome01");
    expect(championsFieldSource).not.toContain("HIDDEN_EFFECT_MESH = /(Body_Octane|BoostPad|Circle_Sprite|CS_FieldFog|CS_FieldGlow|CS_LightCones|CS_StadiumLightBar_Cone|DroneBotThruster|Quad01|S_EV_SimpleLightBeam|SkyDome01");
    expect(championsFieldSource).not.toContain("CHAMPIONS_FIELD_ASSETS.map");
    expect(lightingSource).not.toContain("<fog attach=\"fog\"");
  });

  it("keeps blue isolated to the sky instead of tinting stadium lighting", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    const lightingSource = readFileSync(resolve(process.cwd(), "src/viewer/RocketLeagueLighting.tsx"), "utf8");

    expect(lightingSource).toContain("<color attach=\"background\" args={[SKYBOX_BLUE]} />");
    expect(lightingSource).not.toMatch(/#[0-9a-f]{6}ff/i);
    expect(lightingSource).not.toContain("#b9ecff");
    expect(lightingSource).not.toContain("#d5f5ff");
    expect(lightingSource).not.toContain("#4bb8ff");
    expect(lightingSource).not.toContain("#42b7ff");
    expect(lightingSource).not.toContain("#3f8dff");
    expect(lightingSource).not.toContain("#2ba9ff");
    expect(championsFieldSource).not.toContain("#b7f0ff");
    expect(championsFieldSource).not.toContain("#9fe8ff");
    expect(championsFieldSource).not.toContain("#c0d9df");
  });

  it("does not add the sky background into the bloom overlay", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("const previousBackground = scene.background");
    expect(sceneRootSource).toContain("scene.background = null");
    expect(sceneRootSource).toContain("scene.background = previousBackground");
  });

  it("renders the inside field wall shell as transparent cage geometry", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(championsFieldSource).not.toContain("FieldHexShell|Grass");
    expect(championsFieldSource).toContain("TRANSPARENT_FIELD_WALL_MESH");
    expect(championsFieldSource).toContain("/CS_FieldWalls(?:Glass|RL)?|FieldHexShell/i");
    expect(championsFieldSource).not.toContain("CS_FieldWallsGlass|CS_FieldWallsRL|CS_LightCones");
    expect(championsFieldSource).toContain("opacity: 0.035");
    expect(championsFieldSource).toContain("depthWrite: false");
  });

  it("adds Champions Field color groups for out-of-bounds stadium meshes", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(championsFieldSource).toContain("oobCrowd");
    expect(championsFieldSource).toContain("oobBanners");
    expect(championsFieldSource).toContain("oobCity");
    expect(championsFieldSource).toContain("oobStatue");
    expect(championsFieldSource).toContain("oobTent");
    expect(championsFieldSource).toContain("oobScreen");
    expect(championsFieldSource).toContain("/CS_Stands|CS_Crowd|Crowd/i");
    expect(championsFieldSource).toContain("/WavyFlagPatch|Tifo|CS_RLCS_Flags|Park_BannerScaffold/i");
    expect(championsFieldSource).toContain("/CS_TunnelBanners|CS_CountryFlags/i");
    expect(championsFieldSource).toContain("/CS_SeparatedAds/i");
    expect(championsFieldSource).toContain("/City_OOB|CityGround/i");
    expect(championsFieldSource).toContain("/CS_Statue|CS_Emblem/i");
    expect(championsFieldSource).toContain("/CS_Tent/i");
    expect(championsFieldSource).toContain("/CS_TV|SC_TV/i");
  });

  it("uses scraped texture detail for lit Champions Field signage emissive maps", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");

    expect(championsFieldSource).toContain("banners: new THREE.MeshStandardMaterial({\n      map: textures.bannerPack,\n      emissiveMap: textures.bannerPack");
    expect(championsFieldSource).toContain("countryFlags: new THREE.MeshStandardMaterial({\n      map: textures.countryFlags,\n      emissiveMap: textures.countryFlags");
    expect(championsFieldSource).toContain("advertStrip: new THREE.MeshStandardMaterial({\n      map: textures.advertStrip,\n      emissiveMap: textures.advertStrip");
    expect(championsFieldSource).toContain("cityWindows: new THREE.MeshStandardMaterial({\n      map: textures.windowBarred,\n      emissiveMap: textures.windowBarred");
    expect(championsFieldSource).toContain("if (/CS_TunnelBanners|CS_CountryFlags/i.test(meshName)) return materials.countryFlags;");
    expect(championsFieldSource).toContain("if (/CS_SeparatedAds/i.test(meshName)) return materials.advertStrip;");
    expect(championsFieldSource).toContain("if (/WavyFlagPatch|Tifo|CS_RLCS_Flags|Park_BannerScaffold/i.test(meshName)) return materials.banners;");
    expect(championsFieldSource).toContain('meshName === "CityGround_01" ? materials.cityBuilding : materials.cityWindows');
  });

  it("loads scraped Champions Field textures without reconstructing texture maps from entries", () => {
    const championsFieldSource = readFileSync(resolve(process.cwd(), "src/viewer/ChampionsFieldStadium.tsx"), "utf8");
    const textureSetupSource = championsFieldSource.match(/const CHAMPIONS_FIELD_TEXTURES[\s\S]*?\n};\nconst CHAMPIONS_FIELD_TEXTURE_URLS/)?.[0] ?? "";
    const textureUrlSource = championsFieldSource.match(/const CHAMPIONS_FIELD_TEXTURE_URLS[\s\S]*?\n];/)?.[0] ?? "";
    const textureHookSource = championsFieldSource.match(/function useChampionsFieldTextures[\s\S]*?\n}\n\nfunction configureChampionsFieldTexture/)?.[0] ?? "";

    expect(textureSetupSource).toContain("fieldGrass: publicAsset(championsFieldTextureManifest.textures.fieldGrass.browserPath)");
    expect(textureSetupSource).toContain("handrail: publicAsset(championsFieldTextureManifest.textures.handrail.browserPath)");
    expect(textureUrlSource).toContain("CHAMPIONS_FIELD_TEXTURES.fieldGrass");
    expect(textureUrlSource).toContain("CHAMPIONS_FIELD_TEXTURES.handrail");
    expect(textureHookSource).toContain("useTexture(CHAMPIONS_FIELD_TEXTURE_URLS)");
    expect(textureHookSource).toContain('fieldGrass: configureChampionsFieldTexture(loadedTextures[0], "fieldGrass")');
    expect(textureHookSource).toContain('handrail: configureChampionsFieldTexture(loadedTextures[10], "handrail")');
    expect(textureSetupSource).not.toContain("Object.fromEntries");
    expect(textureHookSource).not.toContain("Object.fromEntries");
    expect(textureHookSource).not.toContain("const entries =");
    expect(textureHookSource).not.toContain("CHAMPIONS_FIELD_TEXTURE_NAMES.map");
  });
});
