import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BoostPad } from "../replay/standardArenaBoostPads";
import { standardArenaBoostPads } from "../replay/standardArenaBoostPads";

type InstanceTransform = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
};

const smallPads = standardArenaBoostPads.filter((pad) => pad.type === "small");
const largePads = standardArenaBoostPads.filter((pad) => pad.type === "large");

export function BoostPads() {
  const geometries = useMemo(
    () => ({
      smallBase: new THREE.CylinderGeometry(1, 1, 8, 16),
      smallRing: new THREE.TorusGeometry(34, 3, 8, 32),
      smallGlow: new THREE.CylinderGeometry(1, 1, 30, 24, 1, true),
      smallCenter: new THREE.CircleGeometry(18, 24),
      largeBase: new THREE.CylinderGeometry(1, 1, 14, 32),
      largeOuterRing: new THREE.TorusGeometry(64, 7, 10, 48),
      largeInnerRing: new THREE.TorusGeometry(42, 3, 8, 40),
      largeGlow: new THREE.CylinderGeometry(1, 1, 92, 32, 1, true),
      largeOrb: new THREE.SphereGeometry(42, 32, 20),
      largePost: new THREE.CylinderGeometry(6, 6, 52, 10)
    }),
    []
  );
  const materials = useMemo(
    () => ({
      smallBase: new THREE.MeshStandardMaterial({ color: "#2a261f", roughness: 0.62, metalness: 0.08 }),
      smallRing: new THREE.MeshBasicMaterial({ color: "#ffc45d", transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, toneMapped: false }),
      smallGlow: new THREE.MeshBasicMaterial({ color: "#ffb340", transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      smallCenter: new THREE.MeshBasicMaterial({ color: "#fff2ac", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, toneMapped: false }),
      largeBase: new THREE.MeshStandardMaterial({ color: "#2a2418", roughness: 0.52, metalness: 0.12 }),
      largeOuterRing: new THREE.MeshBasicMaterial({ color: "#ffad32", transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, toneMapped: false }),
      largeInnerRing: new THREE.MeshBasicMaterial({ color: "#fff0a1", transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, toneMapped: false }),
      largeGlow: new THREE.MeshBasicMaterial({ color: "#ffb52d", transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      largeOrb: new THREE.MeshBasicMaterial({ color: "#ffc247", transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, toneMapped: false }),
      largePost: new THREE.MeshStandardMaterial({ color: "#c9812c", roughness: 0.35, metalness: 0.2 })
    }),
    []
  );

  return (
    <group>
      <InstancedPart geometry={geometries.smallBase} material={materials.smallBase} instances={smallInstances(smallPads, [0, 0, 0], [0, 0, 0], [46, 1, 41])} />
      <InstancedPart geometry={geometries.smallRing} material={materials.smallRing} instances={smallInstances(smallPads, [0, 7, 0], [-Math.PI / 2, 0, 0], [1, 0.9, 1])} />
      <InstancedPart geometry={geometries.smallGlow} material={materials.smallGlow} instances={smallInstances(smallPads, [0, 22, 0], [0, 0, 0], [28, 1, 25])} />
      <InstancedPart geometry={geometries.smallCenter} material={materials.smallCenter} instances={smallInstances(smallPads, [0, 9, 0], [-Math.PI / 2, 0, 0], [1, 0.9, 1])} />

      <InstancedPart geometry={geometries.largeBase} material={materials.largeBase} instances={largeInstances(largePads, [0, 5, 0], [0, 0, 0], [84, 1, 75])} />
      <InstancedPart geometry={geometries.largeOuterRing} material={materials.largeOuterRing} instances={largeInstances(largePads, [0, 15, 0], [-Math.PI / 2, 0, 0], [1, 0.9, 1])} />
      <InstancedPart geometry={geometries.largeInnerRing} material={materials.largeInnerRing} instances={largeInstances(largePads, [0, 18, 0], [-Math.PI / 2, 0, 0], [1, 0.9, 1])} />
      <InstancedPart geometry={geometries.largeGlow} material={materials.largeGlow} instances={largeInstances(largePads, [0, 62, 0], [0, 0, 0], [55, 1, 49])} />
      <InstancedPart geometry={geometries.largeOrb} material={materials.largeOrb} instances={largeInstances(largePads, [0, 58, 0])} />
      <InstancedPart geometry={geometries.largePost} material={materials.largePost} instances={largePostInstances(largePads)} />
    </group>
  );
}

function InstancedPart({
  geometry,
  material,
  instances
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  instances: InstanceTransform[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    instances.forEach((instance, index) => {
      dummy.position.copy(instance.position);
      dummy.rotation.copy(instance.rotation);
      dummy.scale.copy(instance.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, instances]);

  return <instancedMesh ref={ref} args={[geometry, material, instances.length]} />;
}

function smallInstances(pads: BoostPad[], offset: [number, number, number], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
  return padInstances(pads, 3, offset, rotation, scale);
}

function largeInstances(pads: BoostPad[], offset: [number, number, number], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
  return padInstances(pads, 0, offset, rotation, scale);
}

function largePostInstances(pads: BoostPad[]) {
  return [
    ...largeInstances(pads, [-34, 34, 0]),
    ...largeInstances(pads, [34, 34, 0])
  ];
}

function padInstances(
  pads: BoostPad[],
  heightOffset: number,
  offset: [number, number, number],
  rotation: [number, number, number],
  scale: [number, number, number]
): InstanceTransform[] {
  return pads.map((pad) => {
    const [x, y, z] = pad.position;
    return {
      position: new THREE.Vector3(x + offset[0], z + heightOffset + offset[1], -y + offset[2]),
      rotation: new THREE.Euler(rotation[0], rotation[1], rotation[2]),
      scale: new THREE.Vector3(scale[0], scale[1], scale[2])
    };
  });
}
