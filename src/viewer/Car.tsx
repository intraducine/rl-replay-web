import { Html, useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Group } from "three";
import type { CarFrame, ReplayPlayer } from "../replay/types";
import { createBoostPlumeMaterial } from "./boostVisuals";
import { carRenderPosition } from "./carPlacement";
import { publicAsset } from "./publicAsset";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";
import { teamCarPaint, teamClassName } from "./teamColors";

const OCTANE_ASSET = publicAsset("/rl-assets/octane/Body_OctaneWheels_SM.gltf");
const OCTANE_BODY_TEXTURE = publicAsset("/rl-assets/octane/Pepe_Body_D.png");
const OCTANE_CHASSIS_TEXTURE = publicAsset("/rl-assets/octane/Chasis_Pepe_D.png");
const OCTANE_SCALE = 100;
const CAR_BOOST_OBJECT_NAME = "carBoost";
const SUPERSONIC_TRAIL_OBJECT_NAME = "supersonicTrail";
// Measured from the two dense rear-facing OctaneChassis_MIC grille clusters in
// Body_OctaneWheels_SM (the source mesh is scaled by 100 in this viewer).
export const OCTANE_REAR_GRILLE_ANCHORS = [
  [-62, 24.25, -14],
  [-62, 24.25, 14]
] as const;
const BOOST_GRILLE_CENTER: [number, number, number] = [
  (OCTANE_REAR_GRILLE_ANCHORS[0][0] + OCTANE_REAR_GRILLE_ANCHORS[1][0]) / 2,
  (OCTANE_REAR_GRILLE_ANCHORS[0][1] + OCTANE_REAR_GRILLE_ANCHORS[1][1]) / 2,
  (OCTANE_REAR_GRILLE_ANCHORS[0][2] + OCTANE_REAR_GRILLE_ANCHORS[1][2]) / 2
];
const BOOST_OUTER_LENGTH = 138;
const BOOST_CORE_LENGTH = 104;
const BOOST_OUTER_GEOMETRY = createTwinPlumeGeometry(BOOST_OUTER_LENGTH, 10);
const BOOST_CORE_GEOMETRY = createTwinPlumeGeometry(BOOST_CORE_LENGTH, 5.5);

/** Two combined meshes are the full draw budget for each active car boost. */
export const GENERIC_CAR_BOOST_DRAW_CALLS = 2;

export const Car = forwardRef<Group, { frame?: CarFrame; player: ReplayPlayer; selected?: boolean; showNameplate?: boolean }>(function Car(
  { frame, player, selected = false, showNameplate = true },
  ref
) {
  return (
    <group ref={ref} position={frame ? carRenderPosition(frame.position) : [0, 0, 0]} quaternion={frame?.rotation ?? [0, 0, 0, 1]} visible={Boolean(frame)}>
      <Suspense fallback={null}>
        <OctaneModel player={player} />
        <GenericBoost />
      </Suspense>
      <group name={SUPERSONIC_TRAIL_OBJECT_NAME} visible={false}>
        <mesh position={[-120, 0, 0]} rotation-z={Math.PI / 2}>
          <coneGeometry args={[42, 120, 18]} />
          <meshStandardMaterial color="#fff0a6" transparent opacity={0.62} />
        </mesh>
      </group>
      {showNameplate ? (
        <Html position={[0, 150, 0]} center distanceFactor={14}>
          <div className={`nameplate ${teamClassName(player.team)} ${selected ? "selected" : ""}`}>{player.name}</div>
        </Html>
      ) : null}
    </group>
  );
});

function GenericBoost() {
  const rootRef = useRef<Group | null>(null);
  const plumeRef = useRef<Group | null>(null);
  const displayedIntensity = useRef(0);
  const outerMaterial = useMemo(() => createBoostPlumeMaterial("outer", BOOST_OUTER_LENGTH), []);
  const coreMaterial = useMemo(() => createBoostPlumeMaterial("core", BOOST_CORE_LENGTH), []);

  useEffect(
    () => () => {
      outerMaterial.dispose();
      coreMaterial.dispose();
    },
    [coreMaterial, outerMaterial]
  );

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;

    const active = root.userData.boostActive === true;
    const target = active ? 1 : 0;
    displayedIntensity.current = THREE.MathUtils.damp(displayedIntensity.current, target, active ? 24 : 16, delta);
    const intensity = displayedIntensity.current;
    root.visible = intensity > 0.002;
    if (!root.visible) return;

    const replayTime = typeof root.userData.boostTime === "number" ? root.userData.boostTime : clock.elapsedTime;
    const speed = typeof root.userData.speed === "number" ? root.userData.speed : 0;
    const speedScale = 0.88 + THREE.MathUtils.clamp(speed / 2300, 0, 1) * 0.18;
    const flicker = 0.96 + Math.sin(replayTime * 31) * 0.04;
    if (plumeRef.current) plumeRef.current.scale.set(speedScale * flicker, 1, 1);

    outerMaterial.uniforms.uTime.value = replayTime;
    outerMaterial.uniforms.uOpacity.value = intensity;
    coreMaterial.uniforms.uTime.value = replayTime;
    coreMaterial.uniforms.uOpacity.value = intensity;
  });

  return (
    <group ref={rootRef} name={CAR_BOOST_OBJECT_NAME} visible={false}>
      <group ref={plumeRef} position={BOOST_GRILLE_CENTER}>
        <mesh geometry={BOOST_OUTER_GEOMETRY} material={outerMaterial} renderOrder={8} onUpdate={enableBloomLayer} />
        <mesh geometry={BOOST_CORE_GEOMETRY} material={coreMaterial} renderOrder={9} onUpdate={enableBloomLayer} />
      </group>
    </group>
  );
}

function createTwinPlumeGeometry(length: number, radius: number) {
  const geometries = OCTANE_REAR_GRILLE_ANCHORS.map(([, y, z]) => {
    const geometry = new THREE.ConeGeometry(radius, length, 10, 1, true);
    geometry.rotateZ(Math.PI / 2);
    geometry.translate(-length / 2, y - BOOST_GRILLE_CENTER[1], z - BOOST_GRILLE_CENTER[2]);
    return geometry;
  });
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error("Unable to build generic boost plume geometry.");
  return merged;
}

function enableBloomLayer(object: THREE.Object3D) {
  object.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER);
}

function OctaneModel({ player }: { player: ReplayPlayer }) {
  const { scene } = useGLTF(OCTANE_ASSET);
  const [bodyMap, chassisMap] = useTexture([OCTANE_BODY_TEXTURE, OCTANE_CHASSIS_TEXTURE]);
  const octane = useMemo(() => {
    bodyMap.colorSpace = THREE.SRGBColorSpace;
    bodyMap.flipY = false;
    chassisMap.colorSpace = THREE.SRGBColorSpace;
    chassisMap.flipY = false;

    const clone = scene.clone(true);
    const teamPaint = teamCarPaint(player.team);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => buildOctaneMaterial(material, teamPaint, bodyMap, chassisMap));
      } else {
        object.material = buildOctaneMaterial(object.material, teamPaint, bodyMap, chassisMap);
      }

      object.castShadow = true;
      object.receiveShadow = true;
    });

    return clone;
  }, [bodyMap, chassisMap, player.team, scene]);

  return <primitive object={octane} scale={OCTANE_SCALE} />;
}

function buildOctaneMaterial(material: THREE.Material, teamPaint: string, bodyMap: THREE.Texture, chassisMap: THREE.Texture) {
  const sourceName = material.name.toLowerCase();
  const clone =
    material instanceof THREE.MeshStandardMaterial
      ? material.clone()
      : new THREE.MeshStandardMaterial({ name: material.name, roughness: 0.55, metalness: 0.08 });

  clone.vertexColors = false;
  clone.map = null;
  clone.normalMap = null;

  if (sourceName.includes("body_octane")) {
    clone.color.set(teamPaint);
    clone.emissive.set(teamPaint);
    clone.emissiveIntensity = 0.08;
    clone.map = bodyMap;
    clone.roughness = 0.34;
    clone.metalness = 0.22;
    clone.envMapIntensity = 1.45;
  } else if (sourceName.includes("chassis")) {
    clone.color.set("#f7fbff");
    clone.emissive.set("#121a20");
    clone.emissiveIntensity = 0.08;
    clone.map = chassisMap;
    clone.roughness = 0.44;
    clone.metalness = 0.28;
    clone.envMapIntensity = 1.25;
  } else {
    clone.color.set("#07090b");
    clone.emissive.set("#03090d");
    clone.emissiveIntensity = 0.06;
    clone.roughness = 0.66;
    clone.metalness = 0.14;
    clone.envMapIntensity = 0.9;
  }

  return clone;
}

useGLTF.preload(OCTANE_ASSET);
useTexture.preload([OCTANE_BODY_TEXTURE, OCTANE_CHASSIS_TEXTURE]);
