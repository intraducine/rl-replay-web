import type { Quat, Vec3 } from "../replay/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function hermiteVec3(a: Vec3, b: Vec3, velocityA: Vec3, velocityB: Vec3, t: number, spanSeconds: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const tangentA = limitedHermiteTangent(a, b, velocityA, spanSeconds);
  const tangentB = limitedHermiteTangent(a, b, velocityB, spanSeconds);

  return [
    h00 * a[0] + h10 * tangentA[0] + h01 * b[0] + h11 * tangentB[0],
    h00 * a[1] + h10 * tangentA[1] + h01 * b[1] + h11 * tangentB[1],
    h00 * a[2] + h10 * tangentA[2] + h01 * b[2] + h11 * tangentB[2]
  ];
}

function limitedHermiteTangent(a: Vec3, b: Vec3, velocity: Vec3, spanSeconds: number): Vec3 {
  const tangent: Vec3 = [velocity[0] * spanSeconds, velocity[1] * spanSeconds, velocity[2] * spanSeconds];
  const tangentLength = Math.hypot(tangent[0], tangent[1], tangent[2]);
  if (tangentLength === 0) return tangent;

  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const segmentLength = Math.hypot(dx, dy, dz);
  const maxTangentLength = segmentLength * 1.5;
  if (tangentLength <= maxTangentLength) return tangent;

  const scale = maxTangentLength / tangentLength;
  return [tangent[0] * scale, tangent[1] * scale, tangent[2] * scale];
}

export function normalizeQuat(q: Quat): Quat {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (length === 0) return [0, 0, 0, 1];
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

export function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  let bx = b[0];
  let by = b[1];
  let bz = b[2];
  let bw = b[3];
  let cosHalfTheta = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;

  if (cosHalfTheta < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 1) return normalizeQuat(a);

  const sqrSinHalfTheta = 1 - cosHalfTheta * cosHalfTheta;
  if (sqrSinHalfTheta <= Number.EPSILON) {
    return normalizeQuat([
      lerp(a[0], bx, t),
      lerp(a[1], by, t),
      lerp(a[2], bz, t),
      lerp(a[3], bw, t)
    ]);
  }

  const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
  const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return normalizeQuat([
    a[0] * ratioA + bx * ratioB,
    a[1] * ratioA + by * ratioB,
    a[2] * ratioA + bz * ratioB,
    a[3] * ratioA + bw * ratioB
  ]);
}
