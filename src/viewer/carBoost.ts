import type { Group } from "three";
import type { CarFrame } from "../replay/types";

const CAR_BOOST_OBJECT_NAME = "carBoost";
const SUPERSONIC_TRAIL_OBJECT_NAME = "supersonicTrail";

export function setCarBoostActive(car: Group, active: boolean, frame?: CarFrame, renderingEnabled = true, time?: number) {
  const boostGroup =
    (car.userData.boostGroup as Group | undefined)
    ?? (car.getObjectByName(CAR_BOOST_OBJECT_NAME) as Group | undefined);
  if (!boostGroup) return;
  car.userData.boostGroup = boostGroup;

  if (!renderingEnabled) {
    boostGroup.userData.boostActive = false;
    boostGroup.visible = false;
    return;
  }

  boostGroup.userData.speed = frameSpeed(frame);
  if (typeof time === "number") boostGroup.userData.boostTime = time;
  boostGroup.userData.boostActive = active;
  if (active) boostGroup.visible = true;
}

export function setCarSupersonicTrailVisible(car: Group, visible: boolean) {
  const trail =
    (car.userData.supersonicTrail as Group | undefined)
    ?? (car.getObjectByName(SUPERSONIC_TRAIL_OBJECT_NAME) as Group | undefined);
  if (trail) car.userData.supersonicTrail = trail;
  if (trail) trail.visible = visible;
}

function frameSpeed(frame?: CarFrame) {
  const velocity = frame?.velocity;
  if (!velocity) return 0;
  return Math.hypot(velocity[0], velocity[1], velocity[2]);
}
