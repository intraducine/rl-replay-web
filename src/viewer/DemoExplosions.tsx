import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sampleTimeline } from "../replay/ReplayTimeline";
import type { ReplayEvent, ReplayTimeline, Vec3 } from "../replay/types";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";

const DEMO_EXPLOSION_DURATION_SECONDS = 1.35;
const DEMO_EXPLOSION_ANCHOR_LEAD_SECONDS = 0.12;

const LOW_POLY_DEBRIS_CHUNKS = [
  { direction: [1, 0.62, 0.08], speed: 1300, size: [110, 48, 42], spin: [2.1, 3.8, 0.7], delay: 0 },
  { direction: [-0.96, 0.58, -0.14], speed: 1240, size: [92, 64, 36], spin: [1.2, -3.1, 2.7], delay: 0.01 },
  { direction: [0.26, 0.78, 0.98], speed: 1180, size: [72, 52, 130], spin: [-2.5, 1.9, 3.6], delay: 0.02 },
  { direction: [-0.2, 0.76, -1], speed: 1160, size: [68, 52, 120], spin: [2.7, 2.2, -2.4], delay: 0.015 },
  { direction: [0.82, 0.42, 0.58], speed: 1040, size: [80, 44, 78], spin: [-1.6, 2.8, 2.1], delay: 0.035 },
  { direction: [-0.78, 0.44, 0.64], speed: 1020, size: [86, 48, 70], spin: [3.1, -1.4, 2.2], delay: 0.04 },
  { direction: [0.7, 0.94, -0.48], speed: 960, size: [64, 58, 66], spin: [-2.2, -2.6, 1.8], delay: 0.055 },
  { direction: [-0.66, 0.92, 0.5], speed: 930, size: [70, 54, 58], spin: [2.6, 1.7, -2.2], delay: 0.065 },
  { direction: [0.38, 1, 0.28], speed: 900, size: [58, 58, 58], spin: [3.4, -1.8, 1.1], delay: 0.075 },
  { direction: [-0.42, 0.96, -0.24], speed: 870, size: [62, 50, 52], spin: [-2.9, 2.4, 1.6], delay: 0.085 },
  { direction: [1, 0.22, -0.52], speed: 990, size: [96, 34, 46], spin: [1.8, -2.1, 3.4], delay: 0.03 },
  { direction: [-0.98, 0.24, 0.46], speed: 970, size: [94, 36, 44], spin: [-1.7, 2.6, -3.2], delay: 0.03 },
  { direction: [0.1, 1.08, -0.78], speed: 840, size: [54, 72, 48], spin: [2.1, 2.9, -1.5], delay: 0.1 },
  { direction: [-0.08, 1.06, 0.8], speed: 820, size: [56, 70, 50], spin: [-2.4, -1.9, 2.8], delay: 0.105 },
  { direction: [0.54, 0.36, 0.9], speed: 1010, size: [76, 42, 84], spin: [1.3, 3.2, -2.8], delay: 0.05 },
  { direction: [-0.56, 0.34, -0.86], speed: 1000, size: [74, 40, 82], spin: [-1.5, -2.9, 2.5], delay: 0.05 }
] as const;

const LOW_POLY_SMOKE_CHUNKS = [
  { direction: [0, 1.1, 0], drift: 520, size: 360, delay: 0 },
  { direction: [0.56, 0.8, 0.18], drift: 720, size: 300, delay: 0.03 },
  { direction: [-0.62, 0.78, -0.12], drift: 700, size: 320, delay: 0.04 },
  { direction: [0.2, 0.76, 0.62], drift: 660, size: 290, delay: 0.06 },
  { direction: [-0.24, 0.78, -0.64], drift: 650, size: 300, delay: 0.07 },
  { direction: [0.88, 0.58, -0.18], drift: 760, size: 260, delay: 0.1 },
  { direction: [-0.86, 0.58, 0.2], drift: 750, size: 270, delay: 0.11 },
  { direction: [0.44, 0.98, 0.5], drift: 620, size: 250, delay: 0.14 },
  { direction: [-0.46, 0.94, -0.48], drift: 620, size: 250, delay: 0.15 },
  { direction: [0.12, 1.18, -0.28], drift: 560, size: 240, delay: 0.18 },
  { direction: [-0.08, 1.2, 0.32], drift: 560, size: 245, delay: 0.19 },
  { direction: [0.72, 0.52, 0.58], drift: 700, size: 230, delay: 0.22 },
  { direction: [-0.72, 0.52, -0.56], drift: 700, size: 230, delay: 0.23 }
] as const;

const LOW_POLY_CORE_CHUNKS = [
  { direction: [0, 1, 0], speed: 430, size: 260, delay: 0, color: "#fff4b0" },
  { direction: [0.64, 0.62, 0.16], speed: 620, size: 190, delay: 0.015, color: "#ffb24d" },
  { direction: [-0.58, 0.64, -0.2], speed: 600, size: 190, delay: 0.02, color: "#ff7f32" },
  { direction: [0.22, 0.58, 0.7], speed: 560, size: 170, delay: 0.035, color: "#ffd06a" },
  { direction: [-0.2, 0.56, -0.72], speed: 550, size: 170, delay: 0.04, color: "#ff6b26" },
  { direction: [0, 0.82, 0], speed: 360, size: 230, delay: 0.06, color: "#fff0cb" }
] as const;

export const LOW_POLY_DEMO_PART_COUNTS = {
  debrisChunks: LOW_POLY_DEBRIS_CHUNKS.length,
  smokeChunks: LOW_POLY_SMOKE_CHUNKS.length,
  coreChunks: LOW_POLY_CORE_CHUNKS.length,
  shockRings: 0
};

type DemoExplosionInstance = {
  id: string;
  age: number;
  position: Vec3;
  team?: 0 | 1;
};

type DemoExplosionModel = Omit<DemoExplosionInstance, "age"> & {
  t: number;
};

export function demoExplosionInstances(timeline: ReplayTimeline, timeSeconds: number): DemoExplosionInstance[] {
  const instances: DemoExplosionInstance[] = [];
  for (const model of demoExplosionModels(timeline)) {
    const age = timeSeconds - model.t;
    if (age < 0 || age > DEMO_EXPLOSION_DURATION_SECONDS) continue;
    instances.push({
      id: model.id,
      age,
      position: model.position,
      team: model.team
    });
  }
  return instances;
}

export function DemoExplosions({ timeline, playbackTimeRef }: { timeline: ReplayTimeline; playbackTimeRef: { current: number } }) {
  const models = useMemo(() => demoExplosionModels(timeline), [timeline]);
  const refs = useRef<Array<THREE.Group | null>>([]);

  useFrame(() => {
    const time = playbackTimeRef.current;
    for (let index = 0; index < models.length; index += 1) {
      updateLowPolyDemoGroup(refs.current[index], time - models[index].t);
    }
  });

  return (
    <group name="demo-explosions">
      {models.map((model, index) => {
        const teamTint = model.team === 1 ? "#ff8b2d" : "#58a8ff";
        return (
          <group
            key={model.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            name="demo-explosion"
            position={model.position}
            visible={false}
          >
            {LOW_POLY_CORE_CHUNKS.map((chunk, layerIndex) => (
              <mesh key={`core-${layerIndex}`} name={`demo-low-poly-core-${layerIndex}`} renderOrder={12 + layerIndex} onUpdate={enableBloomLayer}>
                {layerIndex % 3 === 0 ? <icosahedronGeometry args={[1, 0]} /> : layerIndex % 3 === 1 ? <dodecahedronGeometry args={[1, 0]} /> : <boxGeometry args={[1, 1, 1]} />}
                <meshStandardMaterial color={chunk.color} emissive={chunk.color} emissiveIntensity={0.85} roughness={0.58} metalness={0.04} transparent opacity={0} flatShading toneMapped={false} />
              </mesh>
            ))}
            {LOW_POLY_DEBRIS_CHUNKS.map((_chunk, layerIndex) => (
              <mesh key={`debris-${layerIndex}`} name={`demo-low-poly-debris-${layerIndex}`} renderOrder={20 + layerIndex}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={layerIndex % 4 === 0 ? "#2d3538" : layerIndex % 4 === 1 ? "#151a1d" : layerIndex % 4 === 2 ? teamTint : "#394347"} roughness={0.82} metalness={0.08} transparent opacity={0} flatShading />
              </mesh>
            ))}
            {LOW_POLY_SMOKE_CHUNKS.map((_chunk, layerIndex) => (
              <mesh key={`smoke-${layerIndex}`} name={`demo-low-poly-smoke-${layerIndex}`} renderOrder={44 + layerIndex}>
                {layerIndex % 2 === 0 ? <dodecahedronGeometry args={[1, 0]} /> : <icosahedronGeometry args={[1, 0]} />}
                <meshStandardMaterial color={layerIndex % 3 === 0 ? "#6b6862" : layerIndex % 3 === 1 ? "#54534f" : "#777069"} roughness={0.96} metalness={0} transparent opacity={0} depthWrite={false} flatShading />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function demoExplosionModels(timeline: ReplayTimeline): DemoExplosionModel[] {
  const models: DemoExplosionModel[] = [];
  const teamByPlayer = new Map(timeline.metadata.players.map((player) => [player.id, player.team]));

  for (const event of timeline.events) {
    if (event.type !== "demo") continue;
    const model = demoExplosionModel(timeline, event, models.length, teamByPlayer);
    if (model) models.push(model);
  }

  return models;
}

function demoExplosionModel(
  timeline: ReplayTimeline,
  event: Extract<ReplayEvent, { type: "demo" }>,
  index: number,
  teamByPlayer: ReadonlyMap<string, 0 | 1>
): DemoExplosionModel | undefined {
  const sample = sampleTimeline(timeline, Math.max(0, event.t - DEMO_EXPLOSION_ANCHOR_LEAD_SECONDS));
  const victimCar = event.victimId ? sample.cars[event.victimId] : undefined;
  const attackerCar = event.attackerId ? sample.cars[event.attackerId] : undefined;
  const car = victimCar ?? attackerCar;
  const team = (event.victimId ? teamByPlayer.get(event.victimId) : undefined) ?? (event.attackerId ? teamByPlayer.get(event.attackerId) : undefined);
  const position = car?.position ?? sample.ball?.position;

  if (!position) return undefined;

  return {
    id: `demo-${index}-${event.t}-${event.victimId ?? "unknown"}-${event.attackerId ?? "unknown"}`,
    t: event.t,
    position: [position[0], position[1], position[2]],
    team
  };
}

function updateLowPolyDemoGroup(group: THREE.Group | null | undefined, age: number) {
  if (!group) return;
  if (age < 0 || age > DEMO_EXPLOSION_DURATION_SECONDS) {
    group.visible = false;
    return;
  }

  group.visible = true;
  const progress = age / DEMO_EXPLOSION_DURATION_SECONDS;
  const expand = easeOutCubic(progress);
  const fadeOut = 1 - smoothstep(0.54, 1, progress);
  const hotFlash = 1 - smoothstep(0.02, 0.36, progress);

  LOW_POLY_CORE_CHUNKS.forEach((chunk, index) => {
    const chunkProgress = delayedProgress(age, chunk.delay, 0.52);
    const direction = normalizeVec3(chunk.direction);
    const lift = Math.sin(chunkProgress * Math.PI) * 170;
    const position: Vec3 = [
      direction[0] * chunk.speed * chunkProgress,
      150 + direction[1] * chunk.speed * chunkProgress + lift,
      direction[2] * chunk.speed * chunkProgress
    ];
    const scale = chunk.size * (1 + hotFlash * 0.45) * (1 - smoothstep(0.68, 1, chunkProgress) * 0.34);
    setLowPolyPart(group, `demo-low-poly-core-${index}`, position, [scale, scale, scale], hotFlash * 0.95, [index * 0.54 + progress * 3.4, index * 0.37 + progress * 2.7, index * 0.22 + progress * 2.9]);
  });

  LOW_POLY_DEBRIS_CHUNKS.forEach((chunk, index) => {
    const chunkProgress = delayedProgress(age, chunk.delay, 0.95);
    const direction = normalizeVec3(chunk.direction);
    const gravity = 520 * chunkProgress * chunkProgress;
    const position: Vec3 = [
      direction[0] * chunk.speed * chunkProgress,
      90 + direction[1] * chunk.speed * chunkProgress - gravity,
      direction[2] * chunk.speed * chunkProgress
    ];
    const debrisFade = (1 - smoothstep(0.64, 1, chunkProgress)) * (1 - smoothstep(0, 0.04, chunk.delay - age));
    setLowPolyPart(group, `demo-low-poly-debris-${index}`, position, chunk.size, debrisFade, [chunk.spin[0] * progress, chunk.spin[1] * progress, chunk.spin[2] * progress]);
  });

  LOW_POLY_SMOKE_CHUNKS.forEach((chunk, index) => {
    const chunkProgress = delayedProgress(age, chunk.delay, 1.08);
    const direction = normalizeVec3(chunk.direction);
    const smokeRise = 240 + 620 * easeOutCubic(chunkProgress);
    const position: Vec3 = [
      direction[0] * chunk.drift * easeOutCubic(chunkProgress),
      smokeRise + direction[1] * chunk.drift * 0.28 * chunkProgress,
      direction[2] * chunk.drift * easeOutCubic(chunkProgress)
    ];
    const scale = chunk.size * (0.48 + easeOutCubic(chunkProgress) * 1.7);
    const smokeOpacity = 0.58 * fadeOut * (1 - smoothstep(0, 0.12, chunk.delay - age));
    setLowPolyPart(group, `demo-low-poly-smoke-${index}`, position, [scale, scale * 0.76, scale], smokeOpacity, [index * 0.48, progress * (0.4 + index * 0.018), index * 0.31]);
  });
}

function setLowPolyPart(group: THREE.Group, name: string, position: Vec3, scale: readonly number[] | number, opacity: number, rotation: readonly number[]) {
  const object = group.getObjectByName(name);
  if (!object) return;
  object.position.fromArray(position);
  if (typeof scale === "number") {
    object.scale.set(scale, scale, scale);
  } else {
    object.scale.set(scale[0], scale[1], scale[2]);
  }
  object.rotation.set(rotation[0], rotation[1], rotation[2]);
  setMaterialOpacity(object, opacity);
}

function setMaterialOpacity(object: THREE.Object3D, opacity: number) {
  const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!material) continue;
    material.opacity = Math.max(0, Math.min(1, opacity));
    material.visible = material.opacity > 0;
    material.needsUpdate = true;
  }
}

function enableBloomLayer(object: THREE.Object3D) {
  object.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER);
}

function delayedProgress(age: number, delay: number, duration: number) {
  return Math.max(0, Math.min(1, (age - delay) / duration));
}

function normalizeVec3(vector: readonly number[]): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
