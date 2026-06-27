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
const CHAMPIONS_FIELD_TEXTURES: Record<ChampionsFieldTextureName, string> = {
  fieldGrass: publicAsset(championsFieldTextureManifest.textures.fieldGrass.browserPath),
  stadiumTrim: publicAsset(championsFieldTextureManifest.textures.stadiumTrim.browserPath),
  stadiumWallMetal: publicAsset(championsFieldTextureManifest.textures.stadiumWallMetal.browserPath),
  bannerPack: publicAsset(championsFieldTextureManifest.textures.bannerPack.browserPath),
  countryFlags: publicAsset(championsFieldTextureManifest.textures.countryFlags.browserPath),
  buildingPack: publicAsset(championsFieldTextureManifest.textures.buildingPack.browserPath),
  windowBarred: publicAsset(championsFieldTextureManifest.textures.windowBarred.browserPath),
  tentFabric: publicAsset(championsFieldTextureManifest.textures.tentFabric.browserPath),
  advertStrip: publicAsset(championsFieldTextureManifest.textures.advertStrip.browserPath),
  stairsPack: publicAsset(championsFieldTextureManifest.textures.stairsPack.browserPath),
  handrail: publicAsset(championsFieldTextureManifest.textures.handrail.browserPath)
};
const CHAMPIONS_FIELD_TEXTURE_URLS: string[] = [
  CHAMPIONS_FIELD_TEXTURES.fieldGrass,
  CHAMPIONS_FIELD_TEXTURES.stadiumTrim,
  CHAMPIONS_FIELD_TEXTURES.stadiumWallMetal,
  CHAMPIONS_FIELD_TEXTURES.bannerPack,
  CHAMPIONS_FIELD_TEXTURES.countryFlags,
  CHAMPIONS_FIELD_TEXTURES.buildingPack,
  CHAMPIONS_FIELD_TEXTURES.windowBarred,
  CHAMPIONS_FIELD_TEXTURES.tentFabric,
  CHAMPIONS_FIELD_TEXTURES.advertStrip,
  CHAMPIONS_FIELD_TEXTURES.stairsPack,
  CHAMPIONS_FIELD_TEXTURES.handrail
];

const FIELD_SURFACE_WIDTH = 76.45;
const FIELD_SURFACE_LENGTH = 117.75;
const FIELD_SURFACE_HEIGHT = 0.035;
const GOAL_ACCENT_Z = FIELD_SURFACE_LENGTH / 2 - 1.35;
const GOAL_ACCENT_WIDTH = 34;
const GOAL_ACCENT_HEIGHT = 10;
const GOAL_ACCENT_CENTER_Y = 4.8;
const GOAL_FLOOR_STRIP_Y = 0.12;
const GOAL_FLOOR_STRIP_WIDTH = 35.5;
const GOAL_FLOOR_STRIP_DEPTH = 0.42;
const HIDDEN_EFFECT_MESH = /(Body_Octane|BoostPad|Circle_Sprite|CS_FieldFog|CS_FieldGlow|CS_LightCones|CS_StadiumLightBar_Cone|DroneBotThruster|Quad01|S_EV_SimpleLightBeam|SpotLightBeam|Stadium_LightCones|TexPropPlane)/i;
const HIDDEN_FIELD_SURFACE_MESH = /^Grass_Base(?:_Flat)?$/i;
const TRANSPARENT_FIELD_WALL_MESH = /CS_FieldWalls(?:Glass|RL)?|FieldHexShell/i;
const GOAL_MESH_BOX = new THREE.Box3();
const GOAL_MESH_CENTER = new THREE.Vector3();
const TEAM_GOAL_MATERIALS = {
  blue: {
    color: "#168cff",
    emissive: "#006bff",
    accent: "#1b9cff",
    halo: "#18a7ff"
  },
  orange: {
    color: "#ff7a18",
    emissive: "#ff5200",
    accent: "#ff8a1c",
    halo: "#ff8a1c"
  }
} as const;
const TEAM_GOAL_EMISSIVE_INTENSITY = 0.74;
const TEAM_GOAL_ACCENT_OPACITY = 0.9;
const TEAM_GOAL_HALO_OPACITY = 0.28;
const TEAM_GOAL_LIGHT_INTENSITY = 7.5;
const TEAM_GOAL_LIGHT_DISTANCE = 4200;

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
  blueGoal: createTeamGoalMaterial("blue"),
  orangeGoal: createTeamGoalMaterial("orange"),
  blueGoalHalo: createTeamGoalHaloMaterial("blue"),
  orangeGoalHalo: createTeamGoalHaloMaterial("orange"),
  blueGoalFloorStrip: createTeamGoalFloorStripMaterial("blue"),
  orangeGoalFloorStrip: createTeamGoalFloorStripMaterial("orange"),
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
      <GoalColorAccents materials={materials} />
    </group>
  );
}

function useChampionsFieldTextures(): ChampionsFieldTextureSet {
  const loadedTextures = useTexture(CHAMPIONS_FIELD_TEXTURE_URLS);

  return useMemo(
    () => ({
      fieldGrass: configureChampionsFieldTexture(loadedTextures[0], "fieldGrass"),
      stadiumTrim: configureChampionsFieldTexture(loadedTextures[1], "stadiumTrim"),
      stadiumWallMetal: configureChampionsFieldTexture(loadedTextures[2], "stadiumWallMetal"),
      bannerPack: configureChampionsFieldTexture(loadedTextures[3], "bannerPack"),
      countryFlags: configureChampionsFieldTexture(loadedTextures[4], "countryFlags"),
      buildingPack: configureChampionsFieldTexture(loadedTextures[5], "buildingPack"),
      windowBarred: configureChampionsFieldTexture(loadedTextures[6], "windowBarred"),
      tentFabric: configureChampionsFieldTexture(loadedTextures[7], "tentFabric"),
      advertStrip: configureChampionsFieldTexture(loadedTextures[8], "advertStrip"),
      stairsPack: configureChampionsFieldTexture(loadedTextures[9], "stairsPack"),
      handrail: configureChampionsFieldTexture(loadedTextures[10], "handrail")
    }),
    [loadedTextures]
  );
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
    blueGoal: createTeamGoalMaterial("blue", textures.stadiumWallMetal),
    orangeGoal: createTeamGoalMaterial("orange", textures.stadiumWallMetal),
    blueFieldAccent: createTeamGoalAccentMaterial("blue", textures.stadiumTrim),
    orangeFieldAccent: createTeamGoalAccentMaterial("orange", textures.stadiumTrim),
    blueGoalHalo: createTeamGoalHaloMaterial("blue"),
    orangeGoalHalo: createTeamGoalHaloMaterial("orange"),
    blueGoalFloorStrip: createTeamGoalFloorStripMaterial("blue"),
    orangeGoalFloorStrip: createTeamGoalFloorStripMaterial("orange"),
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
      emissiveMap: textures.bannerPack,
      color: "#ffffff",
      emissive: "#20100a",
      emissiveIntensity: 0.14,
      roughness: 0.6,
      metalness: 0.02,
      envMapIntensity: 0.95
    }),
    countryFlags: new THREE.MeshStandardMaterial({
      map: textures.countryFlags,
      emissiveMap: textures.countryFlags,
      color: "#ffffff",
      emissive: "#101010",
      emissiveIntensity: 0.12,
      roughness: 0.58,
      metalness: 0.03,
      envMapIntensity: 0.95
    }),
    advertStrip: new THREE.MeshStandardMaterial({
      map: textures.advertStrip,
      emissiveMap: textures.advertStrip,
      color: "#ffffff",
      emissive: "#171717",
      emissiveIntensity: 0.28,
      roughness: 0.42,
      metalness: 0.05,
      envMapIntensity: 1.0
    }),
    oobScreen: new THREE.MeshStandardMaterial({
      map: textures.advertStrip,
      emissiveMap: textures.advertStrip,
      color: "#ffffff",
      emissive: "#243f35",
      emissiveIntensity: 0.52,
      roughness: 0.3,
      metalness: 0.18,
      envMapIntensity: 1.25
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
      emissiveMap: textures.windowBarred,
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

function GoalColorAccents({ materials }: { materials: ChampionsFieldMaterials }) {
  return (
    <>
      <TeamGoalAccent
        z={GOAL_ACCENT_Z}
        haloMaterial={materials.blueGoalHalo}
        floorStripMaterial={materials.blueGoalFloorStrip}
        color={TEAM_GOAL_MATERIALS.blue.halo}
      />
      <TeamGoalAccent
        z={-GOAL_ACCENT_Z}
        rotationY={Math.PI}
        haloMaterial={materials.orangeGoalHalo}
        floorStripMaterial={materials.orangeGoalFloorStrip}
        color={TEAM_GOAL_MATERIALS.orange.halo}
      />
    </>
  );
}

function TeamGoalAccent({
  z,
  rotationY = 0,
  haloMaterial,
  floorStripMaterial,
  color
}: {
  z: number;
  rotationY?: number;
  haloMaterial: THREE.Material;
  floorStripMaterial: THREE.Material;
  color: string;
}) {
  return (
    <group position={[0, 0, z]} rotation={[0, rotationY, 0]}>
      <pointLight position={[0, GOAL_ACCENT_CENTER_Y, 0]} color={color} intensity={TEAM_GOAL_LIGHT_INTENSITY} distance={TEAM_GOAL_LIGHT_DISTANCE} decay={2} />
      <mesh position={[0, GOAL_ACCENT_CENTER_Y, 0]} renderOrder={6}>
        <planeGeometry args={[GOAL_ACCENT_WIDTH, GOAL_ACCENT_HEIGHT]} />
        <primitive object={haloMaterial} attach="material" />
      </mesh>
      <mesh position={[0, GOAL_FLOOR_STRIP_Y, -0.7]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
        <planeGeometry args={[GOAL_FLOOR_STRIP_WIDTH, GOAL_FLOOR_STRIP_DEPTH]} />
        <primitive object={floorStripMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function createTeamGoalMaterial(team: keyof typeof TEAM_GOAL_MATERIALS, texture?: THREE.Texture) {
  const colors = TEAM_GOAL_MATERIALS[team];
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    color: colors.color,
    emissive: colors.emissive,
    emissiveIntensity: TEAM_GOAL_EMISSIVE_INTENSITY,
    roughness: 0.28,
    metalness: 0.2,
    envMapIntensity: 1.42
  });
}

function createTeamGoalAccentMaterial(team: keyof typeof TEAM_GOAL_MATERIALS, texture?: THREE.Texture) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color: TEAM_GOAL_MATERIALS[team].accent,
    transparent: true,
    opacity: TEAM_GOAL_ACCENT_OPACITY,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide
  });
}

function createTeamGoalHaloMaterial(team: keyof typeof TEAM_GOAL_MATERIALS) {
  return new THREE.MeshBasicMaterial({
    color: TEAM_GOAL_MATERIALS[team].halo,
    transparent: true,
    opacity: TEAM_GOAL_HALO_OPACITY,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide
  });
}

function createTeamGoalFloorStripMaterial(team: keyof typeof TEAM_GOAL_MATERIALS) {
  return new THREE.MeshBasicMaterial({
    color: TEAM_GOAL_MATERIALS[team].accent,
    transparent: true,
    opacity: TEAM_GOAL_ACCENT_OPACITY,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide
  });
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
  if (TRANSPARENT_FIELD_WALL_MESH.test(meshName)) return materials.fieldWallGlass;
  if (/Glass/i.test(meshName)) return materials.glass;
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
  if (/OOB_Lights|FieldSpotLights|SearchLights|LightBar/i.test(meshName)) return materials.oobWarmLight;
  if (/CS_FieldLightTrim|CS_CornerArrows/i.test(meshName)) return fieldAccentMaterialForMesh(object, materials);
  if (/Glow|Lights|LightTrim|CornerArrows/i.test(meshName)) return materials.glow;
  if (/CS_FieldWalls|WallMetal/i.test(meshName)) return materials.stadiumWallMetal;
  if (/FieldHexShell|Field|Clamp|Hex|Lattice|Trim/i.test(meshName)) return materials.stadiumTrim;
  return materials.oob;
}

function goalMaterialForMesh(object: THREE.Mesh, materials: ChampionsFieldMaterials) {
  return meshCenterZ(object) >= 0 ? materials.blueGoal : materials.orangeGoal;
}

function fieldAccentMaterialForMesh(object: THREE.Mesh, materials: ChampionsFieldMaterials) {
  return meshCenterZ(object) >= 0 ? materials.blueFieldAccent : materials.orangeFieldAccent;
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
