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
  trimDetail: THREE.Texture;
  wallDetail: THREE.Texture;
};

type ArenaMaterials = ReturnType<typeof createArenaMaterials>;

/**
 * The playable Champions Field enclosure only: turf, goals, walls, cage,
 * clamps, lattice and field lighting. No stands, crowds, city, tents, screens,
 * sky dome or other out-of-bounds dressing is loaded.
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
  const [grass, trimDetail, wallDetail] = useTexture([FIELD_GRASS_TEXTURE, FIELD_TRIM_TEXTURE, FIELD_WALL_TEXTURE]);

  return useMemo(
    () => ({
      grass: configureTexture(grass, true),
      trimDetail: configureTexture(trimDetail, false, THREE.NoColorSpace),
      wallDetail: configureTexture(wallDetail, false, THREE.NoColorSpace)
    }),
    [grass, trimDetail, wallDetail]
  );
}

function configureTexture(texture: THREE.Texture, clamp = false, colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace) {
  texture.colorSpace = colorSpace;
  texture.flipY = false;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createArenaMaterials(textures: ArenaTextures) {
  const turf = new THREE.MeshStandardMaterial({
    name: "champions-field-turf",
    map: textures.grass,
    color: "#bfd0b2",
    roughness: 0.97,
    metalness: 0,
    envMapIntensity: 0.16
  });
  turf.polygonOffset = true;
  turf.polygonOffsetFactor = 1;
  turf.polygonOffsetUnits = 1;

  const wall = new THREE.MeshStandardMaterial({
    name: "champions-field-rubberized-wall",
    color: "#263239",
    bumpMap: textures.wallDetail,
    bumpScale: 0.018,
    roughness: 0.82,
    metalness: 0.08,
    envMapIntensity: 0.34
  });

  const trim = new THREE.MeshStandardMaterial({
    name: "champions-field-painted-steel",
    color: "#56656c",
    bumpMap: textures.trimDetail,
    bumpScale: 0.014,
    roughness: 0.63,
    metalness: 0.34,
    envMapIntensity: 0.52,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  const glass = new THREE.MeshPhysicalMaterial({
    name: "champions-field-cage",
    color: "#d9f2f8",
    roughness: 0.24,
    metalness: 0,
    transmission: 0,
    transparent: true,
    opacity: 0.045,
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
    structuralSteel: new THREE.MeshStandardMaterial({
      name: "champions-field-structural-steel",
      color: "#34434a",
      bumpMap: textures.trimDetail,
      bumpScale: 0.01,
      roughness: 0.7,
      metalness: 0.46,
      envMapIntensity: 0.48
    }),
    neutralLight: new THREE.MeshBasicMaterial({
      name: "champions-field-neutral-field-light",
      color: "#f5fbff",
      toneMapped: false,
      transparent: true,
      opacity: 0.76,
      depthWrite: false
    }),
    blueGoal: createTeamMaterial("blue", textures.wallDetail),
    orangeGoal: createTeamMaterial("orange", textures.wallDetail),
    blueGoalNet: createTeamNetMaterial("blue"),
    orangeGoalNet: createTeamNetMaterial("orange"),
    blueLight: createTeamLightMaterial("blue"),
    orangeLight: createTeamLightMaterial("orange")
  };
}

function createTeamMaterial(team: keyof typeof TEAM_COLORS, texture: THREE.Texture) {
  const colors = TEAM_COLORS[team];
  return new THREE.MeshStandardMaterial({
    name: `champions-field-${team}-goal`,
    color: colors.base,
    bumpMap: texture,
    bumpScale: 0.012,
    emissive: colors.emissive,
    emissiveIntensity: 0.1,
    roughness: 0.66,
    metalness: 0.2,
    envMapIntensity: 0.56,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
}

function createTeamNetMaterial(team: keyof typeof TEAM_COLORS) {
  const colors = TEAM_COLORS[team];
  return new THREE.MeshStandardMaterial({
    name: `champions-field-${team}-goal-net`,
    color: colors.base,
    emissive: colors.emissive,
    emissiveIntensity: 0.08,
    roughness: 0.88,
    metalness: 0,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function createTeamLightMaterial(team: keyof typeof TEAM_COLORS) {
  const colors = TEAM_COLORS[team];
  return new THREE.MeshBasicMaterial({
    name: `champions-field-${team}-light`,
    color: colors.base,
    transparent: true,
    opacity: 0.72,
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
      object.material = materialsForArenaMesh(object, materials);
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
      object.renderOrder = renderOrderForArenaMesh(object.name);
    });

    return clone;
  }, [materials, scene]);

  return <primitive object={model} />;
}

function materialsForArenaMesh(mesh: THREE.Mesh, materials: ArenaMaterials): THREE.Material | THREE.Material[] {
  const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const nextMaterials = sourceMaterials.map((sourceMaterial, index) =>
    materialForArenaMesh(mesh, materials, materialSlot(sourceMaterial, index))
  );
  return Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
}

function materialSlot(material: THREE.Material, fallback: number) {
  const match = material.name.match(/dummy_material_(\d+)/i);
  return match ? Number(match[1]) : fallback;
}

function materialForArenaMesh(mesh: THREE.Mesh, materials: ArenaMaterials, slot: number) {
  const name = mesh.name;
  if (name === "Grass_Base_Flat") return materials.turf;
  if (/FieldHexShell/i.test(name)) return materials.glass;
  if (/WallsGlass/i.test(name)) return slot === 0 ? materials.glass : materials.wall;
  if (/Lattice|ClampsCombined/i.test(name)) return materials.structuralSteel;
  if (/GoalInner/i.test(name)) {
    return slot === 0
      ? teamMaterialForMesh(mesh, materials.blueGoalNet, materials.orangeGoalNet)
      : teamMaterialForMesh(mesh, materials.blueGoal, materials.orangeGoal);
  }
  if (/GoalOuter/i.test(name)) return teamMaterialForMesh(mesh, materials.blueGoal, materials.orangeGoal);
  if (/FieldLightsCombined/i.test(name)) return slot === 0 ? materials.structuralSteel : materials.neutralLight;
  if (/FieldLightTrim/i.test(name)) {
    return slot === 0
      ? materials.structuralSteel
      : teamMaterialForMesh(mesh, materials.blueLight, materials.orangeLight);
  }
  if (/CornerArrows/i.test(name)) {
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
for (const textureUrl of [FIELD_GRASS_TEXTURE, FIELD_TRIM_TEXTURE, FIELD_WALL_TEXTURE]) {
  useTexture.preload(textureUrl);
}
