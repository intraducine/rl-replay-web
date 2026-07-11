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

export const CHAMPIONS_FIELD_PLAYABLE_SCENE = `${ARENA_ASSET_ROOT}/champions-field-playable.glb`;
export const CHAMPIONS_FIELD_BOUNDARY_SCENE = `${ARENA_ASSET_ROOT}/champions-field-boundary.glb`;
export const CHAMPIONS_FIELD_ARENA_SCENES = [CHAMPIONS_FIELD_PLAYABLE_SCENE, CHAMPIONS_FIELD_BOUNDARY_SCENE] as const;

const FIELD_GRASS_TEXTURE = publicAsset(championsFieldTextureManifest.textures.fieldGrass.browserPath);
const FIELD_TRIM_TEXTURE = publicAsset(championsFieldTextureManifest.textures.stadiumTrim.browserPath);
const FIELD_WALL_TEXTURE = publicAsset(championsFieldTextureManifest.textures.stadiumWallMetal.browserPath);

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
  const [grass, trim, wall] = useTexture([FIELD_GRASS_TEXTURE, FIELD_TRIM_TEXTURE, FIELD_WALL_TEXTURE]);

  return useMemo(
    () => ({
      grass: configureTexture(grass, true),
      trim: configureTexture(trim),
      wall: configureTexture(wall)
    }),
    [grass, trim, wall]
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
    opacity: 0.82,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

function ChampionsFieldArenaPart({ url, materials }: { url: string; materials: ArenaMaterials }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = materialForArenaMesh(object, materials);
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
      object.renderOrder = renderOrderForArenaMesh(object.name);
    });

    return clone;
  }, [materials, scene]);

  return <primitive object={model} />;
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
useTexture.preload(FIELD_GRASS_TEXTURE);
useTexture.preload(FIELD_TRIM_TEXTURE);
useTexture.preload(FIELD_WALL_TEXTURE);
