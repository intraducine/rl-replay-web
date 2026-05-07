import * as THREE from "three";
import type { Group } from "three";
import type { CarFrame } from "../replay/types";

const ALPHA_BOOST_OBJECT_NAME = "alphaBoost";
const SUPERSONIC_TRAIL_OBJECT_NAME = "supersonicTrail";
const LOCAL_VELOCITY_VECTOR = new THREE.Vector3();
const LOCAL_VELOCITY_QUATERNION = new THREE.Quaternion();

export function setCarAlphaBoostActive(
  car: Group,
  active: boolean,
  frame?: CarFrame,
  renderingEnabled = true,
  time?: number,
  flameDistanceWindow?: number,
  flameSpawnAges?: number[],
  emitterAgeSeconds?: number
) {
  const boostGroup = (car.userData.alphaBoostGroup as Group | undefined) ?? (car.getObjectByName(ALPHA_BOOST_OBJECT_NAME) as Group | undefined);
  if (!boostGroup) return;
  car.userData.alphaBoostGroup = boostGroup;
  boostGroup.userData.speed = frameSpeed(frame);
  boostGroup.userData.localVelocity = frameLocalVelocity(car, frame);
  if (typeof time === "number") boostGroup.userData.alphaBoostTime = time;
  if (typeof flameDistanceWindow === "number") boostGroup.userData.alphaBoostFlameDistanceWindow = flameDistanceWindow;
  if (Array.isArray(flameSpawnAges)) boostGroup.userData.alphaBoostFlameSpawnAges = flameSpawnAges;
  if (typeof emitterAgeSeconds === "number") boostGroup.userData.alphaBoostEmitterAge = Math.max(0, emitterAgeSeconds);
  if (!renderingEnabled) {
    boostGroup.userData.alphaBoostActive = false;
    boostGroup.userData.boostMeshFade = 0;
    boostGroup.visible = false;
    return;
  }
  boostGroup.userData.alphaBoostActive = active;
  if (active) boostGroup.visible = true;
}

export function setCarSupersonicTrailVisible(car: Group, visible: boolean) {
  const trail = car.getObjectByName(SUPERSONIC_TRAIL_OBJECT_NAME);
  if (trail) trail.visible = visible;
}

function frameSpeed(frame?: CarFrame) {
  const velocity = frame?.velocity;
  if (!velocity) return 0;
  return Math.hypot(velocity[0], velocity[1], velocity[2]);
}

function frameLocalVelocity(car: Group, frame?: CarFrame): [number, number, number] {
  const velocity = frame?.velocity;
  if (!velocity) return [0, 0, 0];

  LOCAL_VELOCITY_VECTOR.fromArray(velocity);
  LOCAL_VELOCITY_QUATERNION.copy(car.quaternion).invert();
  LOCAL_VELOCITY_VECTOR.applyQuaternion(LOCAL_VELOCITY_QUATERNION);
  return LOCAL_VELOCITY_VECTOR.toArray();
}
