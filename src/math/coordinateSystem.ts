import type { Quat, RigidBodyFrame, Vec3 } from "../replay/types";

export type CoordinateDebugOptions = {
  swapYZ?: boolean;
  invertX?: boolean;
  invertY?: boolean;
  invertZ?: boolean;
  invertQuatX?: boolean;
  invertQuatY?: boolean;
  invertQuatZ?: boolean;
  invertQuatW?: boolean;
};

export const defaultCoordinateOptions: CoordinateDebugOptions = {
  swapYZ: false,
  invertX: false,
  invertY: false,
  invertZ: false,
  invertQuatX: false,
  invertQuatY: false,
  invertQuatZ: false,
  invertQuatW: false
};

export function rlPositionToThree(position: Vec3, options: CoordinateDebugOptions = {}): Vec3 {
  const [x, y, z] = position;
  let converted: Vec3 = options.swapYZ ? [x, -y, z] : [x, z, -y];

  if (options.invertX) converted = [-converted[0], converted[1], converted[2]];
  if (options.invertY) converted = [converted[0], -converted[1], converted[2]];
  if (options.invertZ) converted = [converted[0], converted[1], -converted[2]];

  return converted;
}

export function rlQuatToThree(rotation: Quat, options: CoordinateDebugOptions = {}): Quat {
  let q: Quat = [rotation[0], rotation[2], -rotation[1], rotation[3]];
  if (options.invertQuatX) q = [-q[0], q[1], q[2], q[3]];
  if (options.invertQuatY) q = [q[0], -q[1], q[2], q[3]];
  if (options.invertQuatZ) q = [q[0], q[1], -q[2], q[3]];
  if (options.invertQuatW) q = [q[0], q[1], q[2], -q[3]];
  return q;
}

export function transformRigidBodyToThree<T extends RigidBodyFrame>(
  frame: T,
  options: CoordinateDebugOptions = {}
): T {
  return {
    ...frame,
    position: rlPositionToThree(frame.position, options),
    rotation: rlQuatToThree(frame.rotation, options),
    velocity: frame.velocity ? rlPositionToThree(frame.velocity, options) : undefined,
    angularVelocity: frame.angularVelocity ? rlPositionToThree(frame.angularVelocity, options) : undefined
  };
}
