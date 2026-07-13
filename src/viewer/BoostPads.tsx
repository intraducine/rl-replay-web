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
const LARGE_GLOW_ASSET = `${BOOST_PAD_ASSET_ROOT}/BoostPad_Large_Glow.gltf`;
const LARGE_SCROLL_ASSET = `${BOOST_PAD_ASSET_ROOT}/BoostPad_Scroll_SM.gltf`;
const BOOST_PAD_TEXTURE_ROOT = publicAsset("/rl-assets/champions-field-full/Pickup_Boost_Textures/Texture2D");
const SMALL_PAD_TEXTURE = `${BOOST_PAD_TEXTURE_ROOT}/BoostPad_Small_D.dds`;
const LARGE_PAD_TEXTURE = `${BOOST_PAD_TEXTURE_ROOT}/BoostPad_Large_D.dds`;
const PAD_MODEL_SCALE = 100;

type BoostPadGeometries = {
  smallBase: THREE.BufferGeometry;
  smallEnergy: THREE.BufferGeometry;
  largeBase: THREE.BufferGeometry;
  largeDisc: THREE.BufferGeometry;
  largeColumn: THREE.BufferGeometry;
  largeScroll: THREE.BufferGeometry;
};

type BoostPadMaterials = {
  smallBase: THREE.MeshStandardMaterial;
  smallActive: THREE.MeshStandardMaterial;
  largeBase: THREE.MeshStandardMaterial;
  inset: THREE.MeshStandardMaterial;
  energy: THREE.MeshBasicMaterial;
  energyCore: THREE.MeshBasicMaterial;
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
      floatingEnergy.current.rotation.y = clock.elapsedTime * (pad.type === "large" ? 1.45 : 0.8);
      floatingEnergy.current.position.y = pad.type === "large" ? 0.05 + Math.sin(clock.elapsedTime * 3.2 + pad.id) * 0.035 : 0;
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
            <mesh geometry={geometries.largeScroll} material={materials.inset} renderOrder={2} />
            <mesh geometry={geometries.largeDisc} material={materials.energy} renderOrder={3} />
            <group ref={floatingEnergy}>
              <mesh geometry={geometries.largeColumn} material={materials.energyCore} renderOrder={4} />
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
  const largeGlow = useGLTF(LARGE_GLOW_ASSET);
  const largeScroll = useGLTF(LARGE_SCROLL_ASSET);

  return useMemo(() => {
    const small = geometriesByHeight(smallPad.scene);
    const largeGlowParts = geometriesByHeight(largeGlow.scene);
    return {
      smallBase: requiredGeometry(small[0], SMALL_PAD_ASSET),
      smallEnergy: requiredGeometry(small[small.length - 1], SMALL_PAD_ASSET),
      largeBase: requiredGeometry(geometriesByHeight(largePad.scene)[0], LARGE_PAD_ASSET),
      largeDisc: requiredGeometry(largeGlowParts[0], LARGE_GLOW_ASSET),
      largeColumn: requiredGeometry(largeGlowParts[largeGlowParts.length - 1], LARGE_GLOW_ASSET),
      largeScroll: requiredGeometry(geometriesByHeight(largeScroll.scene)[0], LARGE_SCROLL_ASSET)
    };
  }, [largeGlow.scene, largePad.scene, largeScroll.scene, smallPad.scene]);
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
      inset: new THREE.MeshStandardMaterial({
        name: "boost-pad-energy-inset",
        color: "#ffb12f",
        emissive: "#ff8a00",
        emissiveIntensity: 4.2,
        roughness: 0.34,
        metalness: 0.18,
        toneMapped: false
      }),
      energy: new THREE.MeshBasicMaterial({
        name: "boost-pad-amber-energy",
        color: "#ffad2f",
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      energyCore: new THREE.MeshBasicMaterial({
        name: "boost-pad-white-hot-core",
        color: "#ffe9a0",
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
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
useGLTF.preload(LARGE_GLOW_ASSET);
useGLTF.preload(LARGE_SCROLL_ASSET);
