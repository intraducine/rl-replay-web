import type { Vector3 } from "three";
import type { Vec3 } from "../replay/types";

// Grounded replay frames place the car origin about 18 units above the turf.
// The scaled Octane mesh's tire contact patch sits 0.4 units below that origin.
export const CAR_VISUAL_GROUND_OFFSET_Y = -17.6;

export function carRenderPosition(position: Vec3): Vec3 {
  return [position[0], position[1] + CAR_VISUAL_GROUND_OFFSET_Y, position[2]];
}

export function setCarRenderPosition(target: Vector3, position: Vec3): Vector3 {
  return target.set(position[0], position[1] + CAR_VISUAL_GROUND_OFFSET_Y, position[2]);
}
