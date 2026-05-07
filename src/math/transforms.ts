import type { CarFrame, RigidBodyFrame, Vec3 } from "../replay/types";

export function translated<T extends RigidBodyFrame | CarFrame>(frame: T, offset: Vec3): T {
  return {
    ...frame,
    position: [frame.position[0] + offset[0], frame.position[1] + offset[1], frame.position[2] + offset[2]]
  };
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}
