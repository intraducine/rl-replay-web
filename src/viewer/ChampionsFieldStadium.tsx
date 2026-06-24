import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import championsFieldTextureManifest from "./generated/championsFieldTextureManifest.json";
import { publicAsset } from "./publicAsset";

const FIELD_SCALE = 100;

const CHAMPIONS_FIELD_PLACED_ROOT = publicAsset("/rl-assets/champions-field-placed");
export const CHAMPIONS_FIELD_PLACED_SCENE = `${CHAMPIONS_FIELD_PLACED_ROOT}/CS_P_combined.gltf`;
export const CHAMPIONS_FIELD_PLACED_SCENES = [
  CHAMPIONS_FIELD_PLACED_SCENE,
  `${CHAMPIONS_FIELD_PLACED_ROOT}/CS_Field_combined.gltf`,
  `${CHAMPIONS_FIELD_PLACED_ROOT}/CS_Grounds_combined.gltf`,
  `${CHAMPIONS_FIELD_PLACED_ROOT}/CS_Lights_combined.gltf`,
  `${CHAMPIONS_FIELD_PLACED_ROOT}/CS_OOB_combined.gltf`,
  `${CHAMPIONS_FIELD_PLACED_ROOT}/CS_OOB2_combined.gltf`
];
const CHAMPIONS_FIELD_TEXTURE_NAMES = [
  "fieldGrass",
  "stadiumTrim",
  "stadiumWallMetal",
  "bannerPack",
  "countryFlags",
  "buildingPack",
  "windowBarred",
  "tentFabric",
  "advertStrip",
  "stairsPack",
  "handrail"
] as const;
type ChampionsFieldTextureName = (typeof CHAMPIONS_FIELD_TEXTURE_NAMES)[number];
const CHAMPIONS_FIELD_TEXTURES = Object.fromEntries(
  CHAMPIONS_FIELD_TEXTURE_NAMES.map((name) => [name, publicAsset(championsFieldTextureManifest.textures[name].browserPath)])
) as Record<ChampionsFieldTextureName, string>;

const FIELD_SURFACE_WIDTH = 76.45;
const FIELD_SURFACE_LENGTH = 117.75;
const FIELD_SURFACE_HEIGHT = 0.035;
const HIDDEN_EFFECT_MESH = /(Body_Octane|BoostPad|Circle_Sprite|CS_FieldFog|CS_FieldGlow|CS_LightCones|CS_StadiumLightBar_Cone|DroneBotThruster|Quad01|S_EV_SimpleLightBeam|SpotLightBeam|Stadium_LightCones|TexPropPlane)/i;
const HIDDEN_FIELD_SURFACE_MESH = /^Grass_Base(?:_Flat)?$/i;
const TRANSPARENT_FIELD_WALL_MESH = /CS_FieldWalls(?:Glass|RL)?|FieldHexShell/i;
const GOAL_MESH_BOX = new THREE.Box3();
const GOAL_MESH_CENTER = new THREE.Vector3();

const MATERIALS = {
  field: new THREE.MeshStandardMaterial({
    color: "#555f59",
    emissive: "#101512",
    emissiveIntensity: 0.08,
    roughness: 0.62,
    metalness: 0.16,
    envMapIntensity: 1.05
  }),
  glass: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#ffffff",
    emissiveIntensity: 0.02,
    roughness: 0.16,
    metalness: 0.04,
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.4
  }),
  fieldWallGlass: new THREE.MeshStandardMaterial({
    color: "#d8f4ff",
    emissive: "#88cfff",
    emissiveIntensity: 0.035,
    roughness: 0.04,
    metalness: 0.01,
    transparent: true,
    opacity: 0.035,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 1.65
  }),
  grass: new THREE.MeshStandardMaterial({
    color: "#1f6f3b",
    emissive: "#06170c",
    emissiveIntensity: 0.04,
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.48
  }),
  blueGoal: new THREE.MeshStandardMaterial({
    color: "#1d8cff",
    emissive: "#0066ff",
    emissiveIntensity: 0.62,
    roughness: 0.3,
    metalness: 0.18,
    envMapIntensity: 1.35
  }),
  orangeGoal: new THREE.MeshStandardMaterial({
    color: "#ff7a1f",
    emissive: "#ff4a00",
    emissiveIntensity: 0.62,
    roughness: 0.3,
    metalness: 0.18,
    envMapIntensity: 1.35
  }),
  glow: new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.035,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide
  }),
  oob: new THREE.MeshStandardMaterial({
    color: "#343a38",
    emissive: "#0b0d0c",
    emissiveIntensity: 0.08,
    roughness: 0.66,
    metalness: 0.16,
    envMapIntensity: 0.85
  }),
  oobCrowd: new THREE.MeshStandardMaterial({
    color: "#253528",
    emissive: "#10180f",
    emissiveIntensity: 0.18,
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.7
  }),
  oobBanners: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#31130a",
    emissiveIntensity: 0.08,
    roughness: 0.52,
    metalness: 0.08,
    envMapIntensity: 1.05
  }),
  oobCity: new THREE.MeshStandardMaterial({
    color: "#18272c",
    emissive: "#071013",
    emissiveIntensity: 0.18,
    roughness: 0.72,
    metalness: 0.18,
    envMapIntensity: 0.8
  }),
  oobStatue: new THREE.MeshStandardMaterial({
    color: "#8b7657",
    emissive: "#211b12",
    emissiveIntensity: 0.14,
    roughness: 0.48,
    metalness: 0.24,
    envMapIntensity: 1.0
  }),
  oobTent: new THREE.MeshStandardMaterial({
    color: "#dfd2b7",
    emissive: "#241f16",
    emissiveIntensity: 0.1,
    roughness: 0.68,
    metalness: 0.03,
    envMapIntensity: 0.95
  }),
  oobScreen: new THREE.MeshStandardMaterial({
    color: "#111614",
    emissive: "#244037",
    emissiveIntensity: 0.46,
    roughness: 0.32,
    metalness: 0.28,
    envMapIntensity: 1.2
  }),
  oobWarmLight: new THREE.MeshBasicMaterial({
    color: "#fff2c4",
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  }),
  sky: new THREE.MeshBasicMaterial({
    color: "#8fc0dc",
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    transparent: false,
    fog: false
  }),
  trim: new THREE.MeshStandardMaterial({
    color: "#b8b8ad",
    emissive: "#1d1d1a",
    emissiveIntensity: 0.08,
    roughness: 0.34,
    metalness: 0.5,
    envMapIntensity: 1.2
  })
};

type ChampionsFieldTextureSet = Record<ChampionsFieldTextureName, THREE.Texture>;
type ChampionsFieldMaterials = ReturnType<typeof createTextureBackedMaterials>;

export function ChampionsFieldStadium() {
  const textures = useChampionsFieldTextures();
  const materials = useMemo(() => createTextureBackedMaterials(textures), [textures]);

  return (
    <group scale={FIELD_SCALE}>
      {CHAMPIONS_FIELD_PLACED_SCENES.map((url) => (
        <PlacedChampionsFieldScene key={url} url={url} materials={materials} />
      ))}
      <FieldSurfacePlane texture={textures.fieldGrass} />
    </group>
  );
}

function useChampionsFieldTextures(): ChampionsFieldTextureSet {
  const loadedTextures = useTexture(CHAMPIONS_FIELD_TEXTURE_NAMES.map((name) => CHAMPIONS_FIELD_TEXTURES[name]));

  return useMemo(() => {
    const entries = CHAMPIONS_FIELD_TEXTURE_NAMES.map((name, index) => [name, configureChampionsFieldTexture(loadedTextures[index], name)] as const);
    return Object.fromEntries(entries) as ChampionsFieldTextureSet;
  }, [loadedTextures]);
}

function configureChampionsFieldTexture(texture: THREE.Texture, name: ChampionsFieldTextureName) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.wrapS = name === "fieldGrass" ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = name === "fieldGrass" ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (name === "advertStrip") texture.repeat.set(2, 1);
  else if (name === "countryFlags") texture.repeat.set(1.4, 1);
  else texture.repeat.set(1, 1);
  texture.needsUpdate = true;
  return texture;
}

function FieldSurfacePlane({ texture }: { texture: THREE.Texture }) {
  return (
    <mesh position={[0, FIELD_SURFACE_HEIGHT, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} receiveShadow>
      <planeGeometry args={[FIELD_SURFACE_WIDTH, FIELD_SURFACE_LENGTH]} />
      <meshStandardMaterial
        map={texture}
        color="#ffffff"
        roughness={0.88}
        metalness={0.01}
        envMapIntensity={0.42}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function createTextureBackedMaterials(textures: ChampionsFieldTextureSet) {
  return {
    ...MATERIALS,
    grass: new THREE.MeshStandardMaterial({
      map: textures.fieldGrass,
      color: "#ffffff",
      emissive: "#0a0a0a",
      emissiveIntensity: 0.02,
      roughness: 0.88,
      metalness: 0.01,
      envMapIntensity: 0.42
    }),
    stadiumTrim: new THREE.MeshStandardMaterial({
      map: textures.stadiumTrim,
      color: "#ffffff",
      emissiveMap: textures.stadiumTrim,
      emissive: "#111111",
      emissiveIntensity: 0.24,
      roughness: 0.48,
      metalness: 0.34,
      envMapIntensity: 1.08
    }),
    stadiumWallMetal: new THREE.MeshStandardMaterial({
      map: textures.stadiumWallMetal,
      color: "#ffffff",
      emissiveMap: textures.stadiumWallMetal,
      emissive: "#111111",
      emissiveIntensity: 0.1,
      roughness: 0.54,
      metalness: 0.42,
      envMapIntensity: 1.12
    }),
    blueGoal: new THREE.MeshStandardMaterial({
      map: textures.stadiumWallMetal,
      emissiveMap: textures.stadiumWallMetal,
      color: "#1d8cff",
      emissive: "#0066ff",
      emissiveIntensity: 0.62,
      roughness: 0.3,
      metalness: 0.18,
      envMapIntensity: 1.35
    }),
    orangeGoal: new THREE.MeshStandardMaterial({
      map: textures.stadiumWallMetal,
      emissiveMap: textures.stadiumWallMetal,
      color: "#ff7a1f",
      emissive: "#ff4a00",
      emissiveIntensity: 0.62,
      roughness: 0.3,
      metalness: 0.18,
      envMapIntensity: 1.35
    }),
    blueFieldAccent: new THREE.MeshBasicMaterial({
      map: textures.stadiumTrim,
      color: "#1d8cff",
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide
    }),
    orangeFieldAccent: new THREE.MeshBasicMaterial({
      map: textures.stadiumTrim,
      color: "#ff7a1f",
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide
    }),
    oobCrowd: new THREE.MeshStandardMaterial({
      color: "#253528",
      emissive: "#10180f",
      emissiveIntensity: 0.16,
      roughness: 0.82,
      metalness: 0.04,
      envMapIntensity: 0.72
    }),
    banners: new THREE.MeshStandardMaterial({
      map: textures.bannerPack,
      color: "#ffffff",
      emissive: "#20100a",
      emissiveIntensity: 0.08,
      roughness: 0.6,
      metalness: 0.02,
      envMapIntensity: 0.95
    }),
    countryFlags: new THREE.MeshStandardMaterial({
      map: textures.countryFlags,
      color: "#ffffff",
      emissive: "#101010",
      emissiveIntensity: 0.08,
      roughness: 0.58,
      metalness: 0.03,
      envMapIntensity: 0.95
    }),
    advertStrip: new THREE.MeshStandardMaterial({
      map: textures.advertStrip,
      color: "#ffffff",
      emissive: "#171717",
      emissiveIntensity: 0.18,
      roughness: 0.42,
      metalness: 0.05,
      envMapIntensity: 1.0
    }),
    cityBuilding: new THREE.MeshStandardMaterial({
      map: textures.buildingPack,
      color: "#bfc8c4",
      emissive: "#071013",
      emissiveIntensity: 0.12,
      roughness: 0.72,
      metalness: 0.14,
      envMapIntensity: 0.82
    }),
    cityWindows: new THREE.MeshStandardMaterial({
      map: textures.windowBarred,
      color: "#ffffff",
      emissive: "#172722",
      emissiveIntensity: 0.42,
      roughness: 0.42,
      metalness: 0.12,
      envMapIntensity: 0.9
    }),
    oobStatue: new THREE.MeshStandardMaterial({
      map: textures.stadiumWallMetal,
      color: "#ffffff",
      emissiveMap: textures.stadiumWallMetal,
      emissive: "#070707",
      emissiveIntensity: 0.06,
      roughness: 0.5,
      metalness: 0.22,
      envMapIntensity: 1.0
    }),
    tent: new THREE.MeshStandardMaterial({
      map: textures.tentFabric,
      color: "#ffffff",
      emissive: "#1c1710",
      emissiveIntensity: 0.08,
      roughness: 0.76,
      metalness: 0.02,
      envMapIntensity: 0.9
    }),
    stairs: new THREE.MeshStandardMaterial({
      map: textures.stairsPack,
      color: "#ffffff",
      emissive: "#070707",
      emissiveIntensity: 0.04,
      roughness: 0.74,
      metalness: 0.12,
      envMapIntensity: 0.95
    }),
    handrail: new THREE.MeshStandardMaterial({
      map: textures.handrail,
      color: "#ffffff",
      emissive: "#11110e",
      emissiveIntensity: 0.05,
      roughness: 0.46,
      metalness: 0.38,
      envMapIntensity: 1.05
    })
  };
}

function PlacedChampionsFieldScene({ url, materials }: { url: string; materials: ChampionsFieldMaterials }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const meshName = object.name;
      if (HIDDEN_EFFECT_MESH.test(meshName)) {
        object.visible = false;
        return;
      }
      if (HIDDEN_FIELD_SURFACE_MESH.test(meshName)) {
        object.visible = false;
        return;
      }

      object.material = materialForMesh(object, materials);
      object.castShadow = false;
      object.receiveShadow = meshName !== "SkyDome01";
      object.frustumCulled = false;
      object.renderOrder = renderOrderForMesh(meshName);
    });

    return clone;
  }, [materials, scene]);

  return <primitive object={model} />;
}

function materialForMesh(object: THREE.Mesh, materials: ChampionsFieldMaterials) {
  const meshName = object.name;
  if (meshName === "SkyDome01") return materials.sky;
  if (TRANSPARENT_FIELD_WALL_MESH.test(meshName)) return materials.fieldWallGlass.clone();
  if (/Glass/i.test(meshName)) return materials.glass.clone();
  if (/Grass|CS_StatueVegetation/i.test(meshName)) return materials.grass;
  if (/CS_Grounds_Floor|CS_Grounds_Driveway|Stairs/i.test(meshName)) return materials.stairs;
  if (/HandRail/i.test(meshName)) return materials.handrail;
  if (/Goal/i.test(meshName)) return goalMaterialForMesh(object, materials);
  if (/CS_Stands|CS_Crowd|Crowd/i.test(meshName)) return materials.oobCrowd;
  if (/CS_TunnelBanners|CS_CountryFlags/i.test(meshName)) return materials.countryFlags;
  if (/CS_SeparatedAds/i.test(meshName)) return materials.advertStrip;
  if (/WavyFlagPatch|Tifo|CS_RLCS_Flags|Park_BannerScaffold/i.test(meshName)) return materials.banners;
  if (/City_OOB|CityGround/i.test(meshName)) return meshName === "CityGround_01" ? materials.cityBuilding : materials.cityWindows;
  if (/CS_Statue|CS_Emblem/i.test(meshName)) return materials.oobStatue;
  if (/CS_Tent/i.test(meshName)) return materials.tent;
  if (/CS_TV|SC_TV/i.test(meshName)) return materials.oobScreen;
  if (/OOB_Lights|FieldSpotLights|SearchLights|LightBar/i.test(meshName)) return materials.oobWarmLight.clone();
  if (/CS_FieldLightTrim|CS_CornerArrows/i.test(meshName)) return fieldAccentMaterialForMesh(object, materials);
  if (/Glow|Lights|LightTrim|CornerArrows/i.test(meshName)) return materials.glow.clone();
  if (/CS_FieldWalls|WallMetal/i.test(meshName)) return materials.stadiumWallMetal;
  if (/FieldHexShell|Field|Clamp|Hex|Lattice|Trim/i.test(meshName)) return materials.stadiumTrim;
  return materials.oob;
}

function goalMaterialForMesh(object: THREE.Mesh, materials: ChampionsFieldMaterials) {
  return meshCenterZ(object) >= 0 ? materials.blueGoal : materials.orangeGoal;
}

function fieldAccentMaterialForMesh(object: THREE.Mesh, materials: ChampionsFieldMaterials) {
  return (meshCenterZ(object) >= 0 ? materials.blueFieldAccent : materials.orangeFieldAccent).clone();
}

function meshCenterZ(object: THREE.Mesh) {
  GOAL_MESH_BOX.setFromObject(object);
  GOAL_MESH_BOX.getCenter(GOAL_MESH_CENTER);
  return GOAL_MESH_CENTER.z;
}

function renderOrderForMesh(meshName: string) {
  if (meshName === "SkyDome01") return -10;
  if (TRANSPARENT_FIELD_WALL_MESH.test(meshName)) return 4;
  if (/Glass/i.test(meshName)) return 4;
  if (/Glow|Lights|LightTrim|CornerArrows/i.test(meshName)) return 5;
  return 0;
}

for (const sceneUrl of CHAMPIONS_FIELD_PLACED_SCENES) {
  useGLTF.preload(sceneUrl);
}
