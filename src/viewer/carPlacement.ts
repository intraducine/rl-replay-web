import type { Vec3 } from "../replay/types";

export const CAR_VISUAL_GROUND_OFFSET_Y = -34;

export function carRenderPosition(position: Vec3): Vec3 {
  return [position[0], position[1] + CAR_VISUAL_GROUND_OFFSET_Y, position[2]];
}
