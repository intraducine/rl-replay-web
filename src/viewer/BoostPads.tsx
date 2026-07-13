import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import type { BoostPad } from "../replay/standardArenaBoostPads";
import { standardArenaBoostPads } from "../replay/standardArenaBoostPads";
import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import {
  boostPadPlaybackStateAt,
  boostPadScenePosition,
  inferBoostPadPickups,
  type BoostPadPickup
} from "./boostPadPlayback";
import { publicAsset } from "./publicAsset";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";

const BOOST_PAD_ASSET_ROOT = publicAsset("/rl-assets/champions-field-full/Pickup_Boost/StaticMesh3");
const SMALL_PAD_ASSET = `${BOOST_PAD_ASSET_ROOT}/BoostPad_Small_02_SM.gltf`;
const LARGE_PAD_ASSET = `${BOOST_PAD_ASSET_ROOT}/BoostPad_Large.gltf`;
const BOOST_PAD_TEXTURE_ROOT = publicAsset("/rl-assets/champions-field-full/Pickup_Boost_Textures/Texture2D");
const SMALL_PAD_TEXTURE = `${BOOST_PAD_TEXTURE_ROOT}/BoostPad_Small_D.dds`;
const LARGE_PAD_TEXTURE = `${BOOST_PAD_TEXTURE_ROOT}/BoostPad_Large_D.dds`;
const PAD_MODEL_SCALE = 100;

type BoostPadGeometries = {
  smallBase: THREE.BufferGeometry;
  smallEnergy: THREE.BufferGeometry;
  largeBase: THREE.BufferGeometry;
  largeOrb: THREE.SphereGeometry;
  largeOrbHalo: THREE.SphereGeometry;
};

type BoostPadMaterials = {
  smallBase: THREE.MeshStandardMaterial;
  smallActive: THREE.MeshStandardMaterial;
  largeBase: THREE.MeshStandardMaterial;
  orb: THREE.MeshBasicMaterial;
  orbHalo: THREE.MeshBasicMaterial;
};

export function BoostPads({ timeline }: { timeline: ReplayTimeline }) {
  const geometries = useBoostPadGeometries();
  const materials = useBoostPadMaterials();
  const pickupsByPad = useMemo(() => inferBoostPadPickups(timeline), [timeline]);
  const currentTime = useViewerStore((state) => state.currentTime);

  return (
    <group name="rocket-league-boost-pads">
      {standardArenaBoostPads.map((pad) => (
        <BoostPadActor
          key={pad.id}
          pad={pad}
          currentTime={currentTime}
          pickups={pickupsByPad.get(pad.id)}
          geometries={geometries}
          materials={materials}
        />
      ))}
    </group>
  );
}

function BoostPadActor({
  pad,
  currentTime,
  pickups,
  geometries,
  materials
}: {
  pad: BoostPad;
  currentTime: number;
  pickups: BoostPadPickup[] | undefined;
  geometries: BoostPadGeometries;
  materials: BoostPadMaterials;
}) {
  const energyGroup = useRef<THREE.Group>(null);
  const floatingEnergy = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const displayedEnergy = useRef(1);
  const playbackState = boostPadPlaybackStateAt(pad, pickups, currentTime);
  const targetEnergy = useRef(playbackState.energy);
  targetEnergy.current = playbackState.energy;

  useLayoutEffect(() => {
    energyGroup.current?.traverse((object) => object.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER));
  }, []);

  useFrame(({ clock }, delta) => {
    const group = energyGroup.current;
    if (!group) return;

    displayedEnergy.current = THREE.MathUtils.damp(displayedEnergy.current, targetEnergy.current, 24, delta);
    const energy = displayedEnergy.current;
    group.visible = energy > 0.002;
    group.scale.setScalar(Math.max(energy, 0.001));

    if (floatingEnergy.current) {
      floatingEnergy.current.position.y = 0.58 + Math.sin(clock.elapsedTime * 3.2 + pad.id) * 0.025;
    }
    if (light.current) light.current.intensity = 54 * energy;
  });

  const position = boostPadScenePosition(pad);
  return (
    <group name={`boost-pad-${pad.type}-${pad.id}`} position={position} scale={PAD_MODEL_SCALE}>
      {pad.type === "small" ? (
        <>
          <mesh geometry={geometries.smallBase} material={materials.smallBase} receiveShadow />
          <group ref={energyGroup}>
            <mesh geometry={geometries.smallEnergy} material={materials.smallActive} renderOrder={3} />
          </group>
        </>
      ) : (
        <>
          <mesh geometry={geometries.largeBase} material={materials.largeBase} receiveShadow />
          <group ref={energyGroup}>
            <group ref={floatingEnergy} position={[0, 0.58, 0]}>
              <mesh geometry={geometries.largeOrb} material={materials.orb} renderOrder={3} />
              <mesh geometry={geometries.largeOrbHalo} material={materials.orbHalo} renderOrder={4} />
            </group>
            <pointLight ref={light} color="#ffb12f" intensity={54} distance={4.2} decay={2} position={[0, 0.48, 0]} />
          </group>
        </>
      )}
    </group>
  );
}

function useBoostPadGeometries(): BoostPadGeometries {
  const smallPad = useGLTF(SMALL_PAD_ASSET);
  const largePad = useGLTF(LARGE_PAD_ASSET);

  return useMemo(() => {
    const small = geometriesByHeight(smallPad.scene);
    return {
      smallBase: requiredGeometry(small[0], SMALL_PAD_ASSET),
      smallEnergy: requiredGeometry(small[small.length - 1], SMALL_PAD_ASSET),
      largeBase: requiredGeometry(geometriesByHeight(largePad.scene)[0], LARGE_PAD_ASSET),
      largeOrb: new THREE.SphereGeometry(0.31, 32, 24),
      largeOrbHalo: new THREE.SphereGeometry(0.4, 32, 24)
    };
  }, [largePad.scene, smallPad.scene]);
}

function useBoostPadMaterials(): BoostPadMaterials {
  const smallTexture = useLoader(DDSLoader, SMALL_PAD_TEXTURE);
  const largeTexture = useLoader(DDSLoader, LARGE_PAD_TEXTURE);
  useLayoutEffect(() => {
    configurePadTexture(smallTexture);
    configurePadTexture(largeTexture);
  }, [largeTexture, smallTexture]);

  const materials = useMemo<BoostPadMaterials>(
    () => ({
      smallBase: new THREE.MeshStandardMaterial({
        name: "boost-pad-small-plate",
        color: "#5b4524",
        emissive: "#6a3b08",
        emissiveIntensity: 0.32,
        roughness: 0.58,
        metalness: 0.24
      }),
      smallActive: new THREE.MeshStandardMaterial({
        name: "boost-pad-small-pickup",
        map: smallTexture,
        emissiveMap: smallTexture,
        color: "#ffd77a",
        emissive: "#ff8a00",
        emissiveIntensity: 1.7,
        roughness: 0.4,
        metalness: 0.16,
        toneMapped: false
      }),
      largeBase: new THREE.MeshStandardMaterial({
        name: "boost-pad-large-plate",
        map: largeTexture,
        color: "#c8bda4",
        emissive: "#55320b",
        emissiveIntensity: 0.24,
        roughness: 0.5,
        metalness: 0.3
      }),
      orb: new THREE.MeshBasicMaterial({
        name: "boost-pad-full-orb",
        color: "#ffc342",
        toneMapped: false
      }),
      orbHalo: new THREE.MeshBasicMaterial({
        name: "boost-pad-full-orb-halo",
        color: "#ff9f1c",
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    }),
    [largeTexture, smallTexture]
  );

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials]
  );
  return materials;
}

function configurePadTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
}

function geometriesByHeight(scene: THREE.Object3D): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    geometries.push(object.geometry);
  });
  return geometries.sort((left, right) => geometryMaximumHeight(left) - geometryMaximumHeight(right));
}

function geometryMaximumHeight(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  return geometry.boundingBox?.max.y ?? 0;
}

function requiredGeometry(geometry: THREE.BufferGeometry | undefined, asset: string): THREE.BufferGeometry {
  if (!geometry) throw new Error(`Boost pad mesh is missing geometry: ${asset}`);
  return geometry;
}

useGLTF.preload(SMALL_PAD_ASSET);
useGLTF.preload(LARGE_PAD_ASSET);
