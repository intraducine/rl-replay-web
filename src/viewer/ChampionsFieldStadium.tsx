import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import championsFieldTextureManifest from "./generated/championsFieldTextureManifest.json";
import { publicAsset } from "./publicAsset";

const FIELD_SCALE = 100;
const FIELD_SURFACE_WIDTH = 76.45;
const FIELD_SURFACE_LENGTH = 117.75;
const FIELD_SURFACE_Y = 0.006;
const ARENA_ASSET_ROOT = publicAsset("/rl-assets/champions-field-arena");
const PLACED_ASSET_ROOT = publicAsset("/rl-assets/champions-field-placed");

export const CHAMPIONS_FIELD_PLAYABLE_SCENE = `${ARENA_ASSET_ROOT}/champions-field-playable.glb`;
export const CHAMPIONS_FIELD_BOUNDARY_SCENE = `${ARENA_ASSET_ROOT}/champions-field-boundary.glb`;
export const CHAMPIONS_FIELD_ARENA_SCENES = [CHAMPIONS_FIELD_PLAYABLE_SCENE, CHAMPIONS_FIELD_BOUNDARY_SCENE] as const;
export const CHAMPIONS_FIELD_BROADCAST_BACKDROP_SCENES = [
  `${PLACED_ASSET_ROOT}/CS_OOB2_combined.gltf`,
  `${PLACED_ASSET_ROOT}/CS_Lights_combined.gltf`
] as const;

const FIELD_GRASS_TEXTURE = publicAsset(championsFieldTextureManifest.textures.fieldGrass.browserPath);
const FIELD_TRIM_TEXTURE = publicAsset(championsFieldTextureManifest.textures.stadiumTrim.browserPath);
const FIELD_WALL_TEXTURE = publicAsset(championsFieldTextureManifest.textures.stadiumWallMetal.browserPath);
const BANNER_TEXTURE = publicAsset(championsFieldTextureManifest.textures.bannerPack.browserPath);
const FLAGS_TEXTURE = publicAsset(championsFieldTextureManifest.textures.countryFlags.browserPath);
const TENT_TEXTURE = publicAsset(championsFieldTextureManifest.textures.tentFabric.browserPath);
const ADVERT_TEXTURE = publicAsset(championsFieldTextureManifest.textures.advertStrip.browserPath);
const STAIRS_TEXTURE = publicAsset(championsFieldTextureManifest.textures.stairsPack.browserPath);
const HANDRAIL_TEXTURE = publicAsset(championsFieldTextureManifest.textures.handrail.browserPath);

const TEAM_COLORS = {
  blue: { base: "#2778e8", emissive: "#0c5fe7" },
  orange: { base: "#f0782e", emissive: "#ef4d12" }
} as const;

const MESH_WORLD_BOX = new THREE.Box3();
const MESH_WORLD_CENTER = new THREE.Vector3();

type ArenaTextures = {
  grass: THREE.Texture;
  trim: THREE.Texture;
  wall: THREE.Texture;
  banner: THREE.Texture;
  flags: THREE.Texture;
  tent: THREE.Texture;
  advert: THREE.Texture;
  stairs: THREE.Texture;
  handrail: THREE.Texture;
};

type ArenaMaterials = ReturnType<typeof createArenaMaterials>;

/**
 * A deliberately small Champions Field render set: authored turf, goals, walls,
 * transparent cage, clamps, lattice and light trim. Stadium seating, crowd,
 * city, tents, screens, sky dome and other out-of-bounds packages are not loaded.
 */
export function ChampionsFieldStadium() {
  const textures = useArenaTextures();
  const materials = useMemo(() => createArenaMaterials(textures), [textures]);

  return (
    <group scale={FIELD_SCALE} name="champions-field-playable-arena">
      <FieldSurface material={materials.turf} />
      {CHAMPIONS_FIELD_ARENA_SCENES.map((url) => (
        <ChampionsFieldArenaPart key={url} url={url} materials={materials} />
      ))}
      {CHAMPIONS_FIELD_BROADCAST_BACKDROP_SCENES.map((url) => (
        <ChampionsFieldArenaPart key={url} url={url} materials={materials} backdrop />
      ))}
    </group>
  );
}

function FieldSurface({ material }: { material: THREE.Material }) {
  return (
    <mesh name="champions-field-authored-turf" position={[0, FIELD_SURFACE_Y, 0]} rotation-x={-Math.PI / 2} receiveShadow renderOrder={0}>
      <planeGeometry args={[FIELD_SURFACE_WIDTH, FIELD_SURFACE_LENGTH]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function useArenaTextures(): ArenaTextures {
  const [grass, trim, wall, banner, flags, tent, advert, stairs, handrail] = useTexture([
    FIELD_GRASS_TEXTURE,
    FIELD_TRIM_TEXTURE,
    FIELD_WALL_TEXTURE,
    BANNER_TEXTURE,
    FLAGS_TEXTURE,
    TENT_TEXTURE,
    ADVERT_TEXTURE,
    STAIRS_TEXTURE,
    HANDRAIL_TEXTURE
  ]);

  return useMemo(
    () => ({
      grass: configureTexture(grass, true),
      trim: configureTexture(trim),
      wall: configureTexture(wall),
      banner: configureTexture(banner),
      flags: configureTexture(flags),
      tent: configureTexture(tent),
      advert: configureTexture(advert),
      stairs: configureTexture(stairs),
      handrail: configureTexture(handrail)
    }),
    [advert, banner, flags, grass, handrail, stairs, tent, trim, wall]
  );
}

function configureTexture(texture: THREE.Texture, clamp = false) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createArenaMaterials(textures: ArenaTextures) {
  const turf = new THREE.MeshStandardMaterial({
    name: "champions-field-turf",
    map: textures.grass,
    color: "#ffffff",
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.38
  });
  turf.polygonOffset = true;
  turf.polygonOffsetFactor = 1;
  turf.polygonOffsetUnits = 1;

  const wall = new THREE.MeshStandardMaterial({
    name: "champions-field-wall",
    map: textures.wall,
    color: "#a8b3b8",
    roughness: 0.5,
    metalness: 0.32,
    envMapIntensity: 1.05
  });

  const trim = new THREE.MeshStandardMaterial({
    name: "champions-field-trim",
    map: textures.trim,
    emissiveMap: textures.trim,
    color: "#e2e8ea",
    emissive: "#22313a",
    emissiveIntensity: 0.2,
    roughness: 0.4,
    metalness: 0.44,
    envMapIntensity: 1.12,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const glass = new THREE.MeshPhysicalMaterial({
    name: "champions-field-cage",
    color: "#b9d9e7",
    roughness: 0.08,
    metalness: 0,
    transmission: 0.72,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  return {
    turf,
    wall,
    trim,
    glass,
    backdropDark: new THREE.MeshStandardMaterial({
      name: "champions-field-broadcast-backdrop",
      map: textures.wall,
      color: "#6d7880",
      roughness: 0.56,
      metalness: 0.28,
      envMapIntensity: 0.82
    }),
    stands: new THREE.MeshStandardMaterial({
      name: "champions-field-broadcast-stands",
      map: textures.stairs,
      color: "#56616a",
      roughness: 0.72,
      metalness: 0.1,
      envMapIntensity: 0.64
    }),
    handrail: new THREE.MeshStandardMaterial({
      name: "champions-field-broadcast-handrail",
      map: textures.handrail,
      color: "#c2ccd0",
      roughness: 0.45,
      metalness: 0.34,
      envMapIntensity: 0.95
    }),
    advert: new THREE.MeshBasicMaterial({
      name: "champions-field-broadcast-adverts",
      map: textures.advert,
      color: "#ffffff",
      toneMapped: false
    }),
    banners: new THREE.MeshStandardMaterial({
      name: "champions-field-broadcast-banners",
      map: textures.banner,
      color: "#d8e2e7",
      roughness: 0.5,
      metalness: 0.05,
      envMapIntensity: 0.75
    }),
    flags: new THREE.MeshStandardMaterial({
      name: "champions-field-broadcast-flags",
      map: textures.flags,
      color: "#ffffff",
      roughness: 0.48,
      metalness: 0.05,
      envMapIntensity: 0.7
    }),
    tent: new THREE.MeshStandardMaterial({
      name: "champions-field-broadcast-tent",
      map: textures.tent,
      color: "#d9e2e7",
      roughness: 0.72,
      metalness: 0,
      envMapIntensity: 0.58
    }),
    lightCone: new THREE.MeshBasicMaterial({
      name: "champions-field-broadcast-light-cone",
      color: "#d7e8ff",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    }),
    blueGoal: createTeamMaterial("blue", textures.wall),
    orangeGoal: createTeamMaterial("orange", textures.wall),
    blueLight: createTeamLightMaterial("blue", textures.trim),
    orangeLight: createTeamLightMaterial("orange", textures.trim)
  };
}

function createTeamMaterial(team: keyof typeof TEAM_COLORS, texture: THREE.Texture) {
  const colors = TEAM_COLORS[team];
  return new THREE.MeshStandardMaterial({
    name: `champions-field-${team}-goal`,
    map: texture,
    emissiveMap: texture,
    color: colors.base,
    emissive: colors.emissive,
    emissiveIntensity: 0.58,
    roughness: 0.3,
    metalness: 0.24,
    envMapIntensity: 1.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
}

function createTeamLightMaterial(team: keyof typeof TEAM_COLORS, texture: THREE.Texture) {
  const colors = TEAM_COLORS[team];
  return new THREE.MeshBasicMaterial({
    name: `champions-field-${team}-light`,
    map: texture,
    color: colors.base,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

function ChampionsFieldArenaPart({ url, materials, backdrop = false }: { url: string; materials: ArenaMaterials; backdrop?: boolean }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = backdrop ? materialForBackdropMesh(object, materials) : materialForArenaMesh(object, materials);
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
      object.renderOrder = backdrop ? 0 : renderOrderForArenaMesh(object.name);
    });

    return clone;
  }, [backdrop, materials, scene]);

  return <primitive object={model} />;
}

function materialForBackdropMesh(mesh: THREE.Mesh, materials: ArenaMaterials) {
  const name = mesh.name;
  if (/Stands/i.test(name)) return materials.stands;
  if (/HandRail/i.test(name)) return materials.handrail;
  if (/SeparatedAds|Adverts|SC_TV|CS_TV/i.test(name)) return materials.advert;
  if (/TunnelBanners|WavyFlag|Tifo|Banner/i.test(name)) return materials.banners;
  if (/CountryFlags/i.test(name)) return materials.flags;
  if (/Tent/i.test(name)) return materials.tent;
  if (/LightCone|SpotLightBeam|SimpleLightBeam/i.test(name)) return materials.lightCone;
  if (/OOB_Lights|SearchLights|Emblem|Blimp/i.test(name)) return materials.trim;
  return materials.backdropDark;
}

function materialForArenaMesh(mesh: THREE.Mesh, materials: ArenaMaterials) {
  const name = mesh.name;
  if (name === "Grass_Base_Flat") return materials.turf;
  if (/WallsGlass|FieldHexShell/i.test(name)) return materials.glass;
  if (/GoalInner|GoalOuter/i.test(name)) return teamMaterialForMesh(mesh, materials.blueGoal, materials.orangeGoal);
  if (/FieldLightTrim|CornerArrows|FieldLightsCombined/i.test(name)) {
    return teamMaterialForMesh(mesh, materials.blueLight, materials.orangeLight);
  }
  if (/WallsRL|Walls_01/i.test(name)) return materials.wall;
  return materials.trim;
}

function teamMaterialForMesh(mesh: THREE.Mesh, blue: THREE.Material, orange: THREE.Material) {
  MESH_WORLD_BOX.setFromObject(mesh);
  MESH_WORLD_BOX.getCenter(MESH_WORLD_CENTER);
  return MESH_WORLD_CENTER.z >= 0 ? blue : orange;
}

function renderOrderForArenaMesh(name: string) {
  if (name === "Grass_Base_Flat") return 0;
  if (/WallsGlass|FieldHexShell/i.test(name)) return 3;
  if (/FieldLightTrim|CornerArrows|FieldLightsCombined/i.test(name)) return 4;
  return 1;
}

for (const sceneUrl of CHAMPIONS_FIELD_ARENA_SCENES) useGLTF.preload(sceneUrl);
for (const sceneUrl of CHAMPIONS_FIELD_BROADCAST_BACKDROP_SCENES) useGLTF.preload(sceneUrl);
for (const textureUrl of [
  FIELD_GRASS_TEXTURE,
  FIELD_TRIM_TEXTURE,
  FIELD_WALL_TEXTURE,
  BANNER_TEXTURE,
  FLAGS_TEXTURE,
  TENT_TEXTURE,
  ADVERT_TEXTURE,
  STAIRS_TEXTURE,
  HANDRAIL_TEXTURE
]) {
  useTexture.preload(textureUrl);
}
