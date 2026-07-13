import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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
import {
  BOOST_VISUAL_COLORS,
  createBoostBeamMaterial,
  createBoostDiscMaterial,
  createBoostOrbMaterial
} from "./boostVisuals";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";

const SMALL_PADS = standardArenaBoostPads.filter((pad) => pad.type === "small");
const LARGE_PADS = standardArenaBoostPads.filter((pad) => pad.type === "large");
const SMALL_PAD_RADIUS = 78;
const LARGE_PAD_RADIUS = 112;
const SMALL_BEAM_HEIGHT = 68;
const LARGE_BEAM_HEIGHT = 168;
const LARGE_ORB_HEIGHT = 82;
const SMALL_PAD_BASE_GEOMETRY = createBaseGeometry(SMALL_PAD_RADIUS, 12, 12);
const LARGE_PAD_BASE_GEOMETRY = createBaseGeometry(LARGE_PAD_RADIUS, 18, 14);
const SMALL_PAD_BEAM_GEOMETRY = createBeamGeometry(48, SMALL_BEAM_HEIGHT, 10);
const LARGE_PAD_BEAM_GEOMETRY = createBeamGeometry(82, LARGE_BEAM_HEIGHT, 12);
const PAD_GLOW_GEOMETRY = createGroundGlowGeometry();
const LARGE_PAD_ORB_GEOMETRY = new THREE.IcosahedronGeometry(44, 1);
const PAD_BASE_MATERIAL = new THREE.MeshStandardMaterial({
  name: "generic-boost-pad-base",
  color: BOOST_VISUAL_COLORS.bronze,
  emissive: "#5b2707",
  emissiveIntensity: 0.42,
  metalness: 0.42,
  roughness: 0.48,
  flatShading: true
});

/** All 34 pads render in seven instanced draws: two bases and five energy layers. */
export const GENERIC_BOOST_PAD_DRAW_CALLS = 7;

type PadSet = {
  pads: BoostPad[];
  pickupsByPad: ReadonlyMap<number, BoostPadPickup[]>;
  currentTime: number;
};

export function BoostPads({ timeline }: { timeline: ReplayTimeline }) {
  const pickupsByPad = useMemo(() => inferBoostPadPickups(timeline), [timeline]);
  const currentTime = useViewerStore((state) => state.currentTime);

  return (
    <BoostPadInstances
      pads={standardArenaBoostPads}
      pickupsByPad={pickupsByPad}
      currentTime={currentTime}
      name="rocket-league-boost-pads"
    />
  );
}

const DEBUG_PADS: BoostPad[] = [
  { id: -2, type: "small", position: [-140, 0, 0] },
  { id: -1, type: "large", position: [140, 0, 0] }
];

/** The debug preview uses exactly the same instanced geometry and shaders as gameplay. */
export function BoostPadDebugPreview() {
  return <BoostPadInstances pads={DEBUG_PADS} pickupsByPad={new Map()} currentTime={0} name="rocket-league-boost-pad-qa" />;
}

function BoostPadInstances({ pads, pickupsByPad, currentTime, name }: PadSet & { name: string }) {
  const smallPads = useMemo(() => pads.filter((pad) => pad.type === "small"), [pads]);
  const largePads = useMemo(() => pads.filter((pad) => pad.type === "large"), [pads]);
  const displayedEnergy = useRef(new Map<number, number>());
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const beamMaterial = useMemo(() => createBoostBeamMaterial(), []);
  const glowMaterial = useMemo(() => createBoostDiscMaterial(), []);
  const orbMaterial = useMemo(() => createBoostOrbMaterial(), []);
  const meshes = useMemo(
    () => createPadMeshes(smallPads, largePads, beamMaterial, glowMaterial, orbMaterial),
    [beamMaterial, glowMaterial, largePads, orbMaterial, smallPads]
  );

  useEffect(
    () => () => {
      beamMaterial.dispose();
      glowMaterial.dispose();
      orbMaterial.dispose();
      Object.values(meshes).forEach((mesh) => mesh.dispose());
    },
    [beamMaterial, glowMaterial, meshes, orbMaterial]
  );

  useLayoutEffect(() => {
    setStaticBaseMatrices(meshes.smallBase, smallPads, scratch);
    setStaticBaseMatrices(meshes.largeBase, largePads, scratch);
    [meshes.smallGlow, meshes.largeGlow, meshes.smallBeam, meshes.largeBeam, meshes.largeOrb].forEach((mesh) => {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER);
    });
    updateEnergyMatrices({
      pads: smallPads,
      baseRadius: SMALL_PAD_RADIUS,
      currentTime,
      pickupsByPad,
      displayedEnergy: displayedEnergy.current,
      glow: meshes.smallGlow,
      beam: meshes.smallBeam,
      scratch,
      delta: 1 / 60,
      time: 0
    });
    updateEnergyMatrices({
      pads: largePads,
      baseRadius: LARGE_PAD_RADIUS,
      currentTime,
      pickupsByPad,
      displayedEnergy: displayedEnergy.current,
      glow: meshes.largeGlow,
      beam: meshes.largeBeam,
      orb: meshes.largeOrb,
      scratch,
      delta: 1 / 60,
      time: 0
    });
  }, [largePads, meshes, scratch, smallPads]);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    beamMaterial.uniforms.uTime.value = time;
    glowMaterial.uniforms.uTime.value = time;
    orbMaterial.uniforms.uTime.value = time;

    updateEnergyMatrices({
      pads: smallPads,
      baseRadius: SMALL_PAD_RADIUS,
      currentTime,
      pickupsByPad,
      displayedEnergy: displayedEnergy.current,
      glow: meshes.smallGlow,
      beam: meshes.smallBeam,
      scratch,
      delta,
      time
    });
    updateEnergyMatrices({
      pads: largePads,
      baseRadius: LARGE_PAD_RADIUS,
      currentTime,
      pickupsByPad,
      displayedEnergy: displayedEnergy.current,
      glow: meshes.largeGlow,
      beam: meshes.largeBeam,
      orb: meshes.largeOrb,
      scratch,
      delta,
      time
    });
  });

  return (
    <group name={name}>
      <primitive object={meshes.smallBase} />
      <primitive object={meshes.largeBase} />
      <primitive object={meshes.smallGlow} />
      <primitive object={meshes.largeGlow} />
      <primitive object={meshes.smallBeam} />
      <primitive object={meshes.largeBeam} />
      <primitive object={meshes.largeOrb} />
    </group>
  );
}

function createPadMeshes(
  smallPads: BoostPad[],
  largePads: BoostPad[],
  beamMaterial: THREE.ShaderMaterial,
  glowMaterial: THREE.ShaderMaterial,
  orbMaterial: THREE.ShaderMaterial
) {
  const meshes = {
    smallBase: new THREE.InstancedMesh(SMALL_PAD_BASE_GEOMETRY, PAD_BASE_MATERIAL, smallPads.length),
    largeBase: new THREE.InstancedMesh(LARGE_PAD_BASE_GEOMETRY, PAD_BASE_MATERIAL, largePads.length),
    smallGlow: new THREE.InstancedMesh(PAD_GLOW_GEOMETRY, glowMaterial, smallPads.length),
    largeGlow: new THREE.InstancedMesh(PAD_GLOW_GEOMETRY, glowMaterial, largePads.length),
    smallBeam: new THREE.InstancedMesh(SMALL_PAD_BEAM_GEOMETRY, beamMaterial, smallPads.length),
    largeBeam: new THREE.InstancedMesh(LARGE_PAD_BEAM_GEOMETRY, beamMaterial, largePads.length),
    largeOrb: new THREE.InstancedMesh(LARGE_PAD_ORB_GEOMETRY, orbMaterial, largePads.length)
  };
  meshes.smallGlow.renderOrder = meshes.largeGlow.renderOrder = 3;
  meshes.smallBeam.renderOrder = meshes.largeBeam.renderOrder = 4;
  meshes.largeOrb.renderOrder = 5;
  const scratch = new THREE.Object3D();
  setStaticBaseMatrices(meshes.smallBase, smallPads, scratch);
  setStaticBaseMatrices(meshes.largeBase, largePads, scratch);
  initializeEnergyMatrices(meshes.smallGlow, meshes.smallBeam, undefined, smallPads, SMALL_PAD_RADIUS, scratch);
  initializeEnergyMatrices(meshes.largeGlow, meshes.largeBeam, meshes.largeOrb, largePads, LARGE_PAD_RADIUS, scratch);
  return meshes;
}

function initializeEnergyMatrices(
  glow: THREE.InstancedMesh,
  beam: THREE.InstancedMesh,
  orb: THREE.InstancedMesh | undefined,
  pads: BoostPad[],
  baseRadius: number,
  scratch: THREE.Object3D
) {
  pads.forEach((pad, index) => {
    const position = boostPadScenePosition(pad);
    scratch.position.set(position[0], position[1] + 10, position[2]);
    scratch.rotation.set(0, 0, 0);
    scratch.scale.set(baseRadius * 1.5, 1, baseRadius * 1.5);
    scratch.updateMatrix();
    glow.setMatrixAt(index, scratch.matrix);

    scratch.position.fromArray(position);
    scratch.rotation.set(0, pad.id * 0.47, 0);
    scratch.scale.set(1, 1, 1);
    scratch.updateMatrix();
    beam.setMatrixAt(index, scratch.matrix);

    if (orb) {
      scratch.position.set(position[0], position[1] + LARGE_ORB_HEIGHT, position[2]);
      scratch.rotation.set(0, pad.id, 0);
      scratch.scale.set(1, 1, 1);
      scratch.updateMatrix();
      orb.setMatrixAt(index, scratch.matrix);
    }
  });
  glow.instanceMatrix.needsUpdate = true;
  beam.instanceMatrix.needsUpdate = true;
  if (orb) orb.instanceMatrix.needsUpdate = true;
}

function setStaticBaseMatrices(mesh: THREE.InstancedMesh, pads: BoostPad[], scratch: THREE.Object3D) {
  pads.forEach((pad, index) => {
    scratch.position.fromArray(boostPadScenePosition(pad));
    scratch.rotation.set(0, pad.id * 0.71, 0);
    scratch.scale.set(1, 1, 1);
    scratch.updateMatrix();
    mesh.setMatrixAt(index, scratch.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

type EnergyUpdate = {
  pads: BoostPad[];
  baseRadius: number;
  currentTime: number;
  pickupsByPad: ReadonlyMap<number, BoostPadPickup[]>;
  displayedEnergy: Map<number, number>;
  glow: THREE.InstancedMesh | null;
  beam: THREE.InstancedMesh | null;
  orb?: THREE.InstancedMesh | null;
  scratch: THREE.Object3D;
  delta: number;
  time: number;
};

function updateEnergyMatrices({
  pads,
  baseRadius,
  currentTime,
  pickupsByPad,
  displayedEnergy,
  glow,
  beam,
  orb,
  scratch,
  delta,
  time
}: EnergyUpdate) {
  pads.forEach((pad, index) => {
    const target = boostPadPlaybackStateAt(pad, pickupsByPad.get(pad.id), currentTime).energy;
    const energy = THREE.MathUtils.damp(displayedEnergy.get(pad.id) ?? 1, target, 24, delta);
    displayedEnergy.set(pad.id, energy);
    const position = boostPadScenePosition(pad);
    const visibleScale = Math.max(energy, 0.0001);
    const pulse = 0.96 + Math.sin(time * 4.2 + pad.id * 0.73) * 0.04;

    if (glow) {
      scratch.position.set(position[0], position[1] + 10, position[2]);
      scratch.rotation.set(0, 0, 0);
      scratch.scale.set(baseRadius * 1.5 * visibleScale, 1, baseRadius * 1.5 * visibleScale);
      scratch.updateMatrix();
      glow.setMatrixAt(index, scratch.matrix);
      if (import.meta.env.DEV && pad.id < 0 && time === 0) {
        const debugMatrix = new THREE.Matrix4();
        glow.getMatrixAt(index, debugMatrix);
        console.info("boost-pad-instance", JSON.stringify({ id: pad.id, matrix: debugMatrix.elements }));
      }
    }

    if (beam) {
      scratch.position.fromArray(position);
      scratch.rotation.set(0, pad.id * 0.47, 0);
      scratch.scale.set(visibleScale * pulse, visibleScale, visibleScale * pulse);
      scratch.updateMatrix();
      beam.setMatrixAt(index, scratch.matrix);
    }

    if (orb) {
      scratch.position.set(position[0], position[1] + LARGE_ORB_HEIGHT + Math.sin(time * 2.8 + pad.id) * 5, position[2]);
      scratch.rotation.set(time * 0.44, time * 0.72 + pad.id, time * 0.31);
      scratch.scale.setScalar(visibleScale * pulse);
      scratch.updateMatrix();
      orb.setMatrixAt(index, scratch.matrix);
    }
  });

  if (glow) glow.instanceMatrix.needsUpdate = true;
  if (beam) beam.instanceMatrix.needsUpdate = true;
  if (orb) orb.instanceMatrix.needsUpdate = true;
}

function createBaseGeometry(radius: number, height: number, segments: number) {
  const geometry = new THREE.CylinderGeometry(radius * 0.91, radius, height, segments, 1, false);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function createBeamGeometry(radius: number, height: number, segments: number) {
  const geometry = new THREE.ConeGeometry(radius, height, segments, 1, true);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function createGroundGlowGeometry() {
  const geometry = new THREE.CircleGeometry(1, 24);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
