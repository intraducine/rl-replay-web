import { clamp, hermiteVec3, lerp, lerpVec3, slerpQuat } from "../math/interpolation";
import type { CarFrame, ReplayCameraSample, ReplayCameraSettings, ReplayTimeline, RigidBodyFrame, SampledReplayState, TimelineFrame } from "./types";

type MotionKeyframe<T extends RigidBodyFrame> = {
  t: number;
  frame: T;
};

type TimelineSamplingIndex = {
  ball: MotionKeyframe<RigidBodyFrame>[];
  cars: Map<string, MotionKeyframe<CarFrame>[]>;
  camera: Map<string, ReplayCameraSample[]>;
};

type CarDistanceSample = {
  t: number;
  position: [number, number, number] | undefined;
  distance: number;
};

const MOTION_EPSILON_SQ = 0.01;
const ROTATION_DOT_EPSILON = 0.99999;
const MAX_SMOOTH_SPAN_SECONDS = 0.75;
const CAR_RESET_DISTANCE = 1800;
const CAR_MAX_SPEED = 9000;
const BALL_RESET_DISTANCE = 2600;
const BALL_MAX_SPEED = 18000;
const samplingIndexCache = new WeakMap<ReplayTimeline, TimelineSamplingIndex>();
const carDistanceTrackCache = new WeakMap<ReplayTimeline, Map<string, CarDistanceSample[]>>();

function interpolateRigidBody(a: RigidBodyFrame, b: RigidBodyFrame, alpha: number, spanSeconds?: number): RigidBodyFrame {
  return {
    position:
      a.velocity && b.velocity && spanSeconds !== undefined
        ? hermiteVec3(a.position, b.position, a.velocity, b.velocity, alpha, spanSeconds)
        : lerpVec3(a.position, b.position, alpha),
    rotation: slerpQuat(a.rotation, b.rotation, alpha),
    velocity: a.velocity && b.velocity ? lerpVec3(a.velocity, b.velocity, alpha) : a.velocity ?? b.velocity,
    angularVelocity:
      a.angularVelocity && b.angularVelocity
        ? lerpVec3(a.angularVelocity, b.angularVelocity, alpha)
        : a.angularVelocity ?? b.angularVelocity
  };
}

function interpolateCar(a: CarFrame, b: CarFrame, alpha: number, spanSeconds?: number): CarFrame {
  return {
    ...interpolateRigidBody(a, b, alpha, spanSeconds),
    boost: a.boost !== undefined && b.boost !== undefined ? a.boost + (b.boost - a.boost) * alpha : a.boost ?? b.boost,
    boostActive: alpha < 0.5 ? a.boostActive ?? b.boostActive : b.boostActive ?? a.boostActive,
    demolished: sampleDemolishedState(a.demolished, b.demolished, alpha),
    supersonic: alpha < 0.5 ? a.supersonic : b.supersonic
  };
}

function sampleDemolishedState(a: boolean | undefined, b: boolean | undefined, alpha: number): boolean | undefined {
  if (a === b) return a;
  if (a && !b) return alpha < 1 ? true : b;
  if (!a && b) return alpha >= 1 ? true : a;
  return alpha < 0.5 ? a : b;
}

function buildSamplingIndex(timeline: ReplayTimeline): TimelineSamplingIndex {
  const cached = samplingIndexCache.get(timeline);
  if (cached) return cached;

  const index: TimelineSamplingIndex = {
    ball: [],
    cars: new Map(),
    camera: new Map()
  };

  for (const frame of timeline.frames) {
    if (frame.ball) appendMotionKeyframe(index.ball, frame.t, frame.ball);

    for (const [id, car] of Object.entries(frame.cars)) {
      let track = index.cars.get(id);
      if (!track) {
        track = [];
        index.cars.set(id, track);
      }
      appendMotionKeyframe(track, frame.t, car);
    }
  }

  const rawCameraTracks = new Map<string, ReplayCameraSample[]>();
  for (const sample of timeline.camera ?? []) {
    let track = rawCameraTracks.get(sample.playerId);
    if (!track) {
      track = [];
      rawCameraTracks.set(sample.playerId, track);
    }
    track.push(sample);
  }

  for (const [playerId, track] of rawCameraTracks) {
    track.sort((a, b) => a.t - b.t);
    const cumulative: ReplayCameraSample[] = [];
    for (const sample of track) {
      const previous = cumulative.at(-1);
      cumulative.push({ ...previous, ...sample, settings: sample.settings ?? previous?.settings });
    }
    index.camera.set(playerId, cumulative);
  }

  samplingIndexCache.set(timeline, index);
  return index;
}

function appendMotionKeyframe<T extends RigidBodyFrame>(track: MotionKeyframe<T>[], t: number, frame: T) {
  if (track.length === 0 || !sameRigidBodyPose(track[track.length - 1].frame, frame)) {
    track.push({ t, frame });
  }
}

function sameRigidBodyPose(a: RigidBodyFrame, b: RigidBodyFrame): boolean {
  return positionDistanceSq(a, b) <= MOTION_EPSILON_SQ && Math.abs(quatDot(a.rotation, b.rotation)) >= ROTATION_DOT_EPSILON;
}

function positionDistanceSq(a: RigidBodyFrame, b: RigidBodyFrame): number {
  const dx = a.position[0] - b.position[0];
  const dy = a.position[1] - b.position[1];
  const dz = a.position[2] - b.position[2];
  return dx * dx + dy * dy + dz * dz;
}

function quatDot(a: RigidBodyFrame["rotation"], b: RigidBodyFrame["rotation"]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

function sampleMotionTrack<T extends RigidBodyFrame>(
  track: MotionKeyframe<T>[] | undefined,
  t: number,
  interpolate: (a: T, b: T, alpha: number, spanSeconds?: number) => T,
  maxDistance: number,
  maxSpeed: number
): T | undefined {
  if (!track?.length) return undefined;
  if (track.length === 1 || t <= track[0].t) return track[0].frame;
  if (t >= track[track.length - 1].t) return track[track.length - 1].frame;

  let low = 0;
  let high = track.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (track[mid].t < t) low = mid + 1;
    else high = mid - 1;
  }

  const next = track[low];
  const previous = track[low - 1];
  const span = next.t - previous.t;
  if (span <= 0) return previous.frame;

  const distance = Math.sqrt(positionDistanceSq(previous.frame, next.frame));
  if (distance > maxDistance || distance / span > maxSpeed) {
    return t < next.t ? previous.frame : next.frame;
  }
  if (span > MAX_SMOOTH_SPAN_SECONDS) return undefined;

  return interpolate(previous.frame, next.frame, (t - previous.t) / span, span);
}

function findFramePair(frames: TimelineFrame[], t: number): [TimelineFrame, TimelineFrame, number] {
  const [previousIndex, nextIndex, alpha] = findFramePairIndices(frames, t);
  return [frames[previousIndex], frames[nextIndex], alpha];
}

function findFramePairIndices(frames: TimelineFrame[], t: number): [number, number, number] {
  if (frames.length === 0) {
    throw new Error("Cannot sample an empty replay timeline.");
  }

  const clamped = clamp(t, frames[0].t, frames[frames.length - 1].t);
  let low = 0;
  let high = frames.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].t < clamped) low = mid + 1;
    else high = mid - 1;
  }

  const nextIndex = clamp(low, 0, frames.length - 1);
  const prevIndex = clamp(nextIndex - 1, 0, frames.length - 1);
  const previous = frames[prevIndex];
  const next = frames[nextIndex];
  const span = next.t - previous.t;
  const alpha = span > 0 ? (clamped - previous.t) / span : 0;

  return [prevIndex, nextIndex, alpha];
}

function nearestCarState(previous: TimelineFrame, next: TimelineFrame, id: string, alpha: number): CarFrame | undefined {
  const a = previous.cars[id];
  const b = next.cars[id];
  if (a && b) return interpolateCar(a, b, alpha);
  return alpha < 0.5 ? a ?? b : b ?? a;
}

export function sampleTimeline(timeline: ReplayTimeline, timeSeconds: number): SampledReplayState {
  const [previousIndex, nextIndex, alpha] = findFramePairIndices(timeline.frames, timeSeconds);
  const previous = timeline.frames[previousIndex];
  const next = timeline.frames[nextIndex];
  const sampledTime = previous.t + (next.t - previous.t) * alpha;
  const samplingIndex = buildSamplingIndex(timeline);
  const cars: Record<string, CarFrame> = {};

  for (const id of Object.keys(previous.cars)) {
    appendSampledCar(cars, samplingIndex, previous, next, id, sampledTime, alpha);
  }
  for (const id of Object.keys(next.cars)) {
    if (Object.prototype.hasOwnProperty.call(previous.cars, id)) continue;
    appendSampledCar(cars, samplingIndex, previous, next, id, sampledTime, alpha);
  }

  const adjacentBall =
    previous.ball && next.ball
      ? interpolateRigidBody(previous.ball, next.ball, alpha)
      : alpha < 0.5
        ? previous.ball ?? next.ball
        : next.ball ?? previous.ball;
  const ball = sampleMotionTrack(samplingIndex.ball, sampledTime, interpolateRigidBody, BALL_RESET_DISTANCE, BALL_MAX_SPEED) ?? adjacentBall;

  return {
    t: sampledTime,
    ball,
    cars
  };
}

function appendSampledCar(
  cars: Record<string, CarFrame>,
  samplingIndex: TimelineSamplingIndex,
  previous: TimelineFrame,
  next: TimelineFrame,
  carId: string,
  sampledTime: number,
  alpha: number
) {
  const car = sampleCarFromFramePair(samplingIndex, previous, next, carId, sampledTime, alpha);
  if (car && !car.demolished) cars[carId] = car;
}

function sampleCarFromFramePair(
  samplingIndex: TimelineSamplingIndex,
  previous: TimelineFrame,
  next: TimelineFrame,
  carId: string,
  sampledTime: number,
  alpha: number
): CarFrame | undefined {
  const nearest = nearestCarState(previous, next, carId, alpha);
  const motion = sampleMotionTrack(samplingIndex.cars.get(carId), sampledTime, interpolateCar, CAR_RESET_DISTANCE, CAR_MAX_SPEED);
  return nearest && motion
    ? {
        ...motion,
        boost: nearest.boost ?? motion.boost,
        boostActive: nearest.boostActive ?? motion.boostActive,
        demolished: nearest.demolished,
        supersonic: nearest.supersonic
      }
    : nearest ?? motion;
}

function sampleCarForWindow(timeline: ReplayTimeline, carId: string, timeSeconds: number): CarFrame | undefined {
  const [previousIndex, nextIndex, alpha] = findFramePairIndices(timeline.frames, timeSeconds);
  const previous = timeline.frames[previousIndex];
  const next = timeline.frames[nextIndex];
  const sampledTime = previous.t + (next.t - previous.t) * alpha;
  const car = sampleCarFromFramePair(buildSamplingIndex(timeline), previous, next, carId, sampledTime, alpha);
  return car && !car.demolished ? car : undefined;
}

export function samplePlayerCameraState(timeline: ReplayTimeline, playerId: string | undefined, timeSeconds: number): ReplayCameraSample | undefined {
  if (!playerId) return undefined;
  const track = buildSamplingIndex(timeline).camera.get(playerId);
  if (!track?.length) return undefined;
  if (timeSeconds <= track[0].t) return track[0];
  if (timeSeconds >= track[track.length - 1].t) return track[track.length - 1];

  let low = 0;
  let high = track.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (track[mid].t <= timeSeconds) low = mid + 1;
    else high = mid - 1;
  }

  const previous = track[Math.max(0, high)];
  const next = track[low];
  const span = next.t - previous.t;
  if (span <= 0 || !previous.settings || !next.settings) return previous;

  return {
    ...previous,
    settings: interpolateCameraSettings(previous.settings, next.settings, (timeSeconds - previous.t) / span)
  };
}

function interpolateCameraSettings(a: ReplayCameraSettings, b: ReplayCameraSettings, alpha: number): ReplayCameraSettings {
  return {
    fov: lerp(a.fov, b.fov, alpha),
    height: lerp(a.height, b.height, alpha),
    angle: lerp(a.angle, b.angle, alpha),
    distance: lerp(a.distance, b.distance, alpha),
    stiffness: lerp(a.stiffness, b.stiffness, alpha),
    swivel: lerp(a.swivel, b.swivel, alpha),
    transition: a.transition !== undefined && b.transition !== undefined ? lerp(a.transition, b.transition, alpha) : a.transition ?? b.transition
  };
}

export function timelineDuration(timeline: ReplayTimeline): number {
  return timeline.frames.at(-1)?.t ?? timeline.metadata.durationSeconds;
}

export function sampleCarDistanceWindow(timeline: ReplayTimeline, carId: string, endTimeSeconds: number, windowSeconds: number): number {
  return carWindowSamples(timeline, carId, endTimeSeconds, windowSeconds).distance;
}

export function sampleCarSpawnPerUnitAgesWindow(
  timeline: ReplayTimeline,
  carId: string,
  endTimeSeconds: number,
  windowSeconds: number,
  spawnPerUnit: number,
  spawnRateScalar: number,
  emitterStartTimeSeconds?: number
): number[] {
  const interval = 1 / (spawnPerUnit * spawnRateScalar);
  if (!(interval > 0)) return [];

  if (typeof emitterStartTimeSeconds === "number") {
    return sampleCarSpawnPerUnitAgesFromEmitterStart(
      timeline,
      carId,
      endTimeSeconds,
      windowSeconds,
      interval,
      emitterStartTimeSeconds
    );
  }

  const { samples } = carWindowSamples(timeline, carId, endTimeSeconds, windowSeconds);
  const ages: number[] = [];
  let nextSpawnDistance = interval;
  let distanceFromEnd = 0;

  for (let index = samples.length - 1; index > 0; index--) {
    const current = samples[index];
    const previous = samples[index - 1];
    if (!current.position || !previous.position) continue;

    const segmentDistance = vec3Distance(previous.position, current.position);
    if (segmentDistance <= 0) continue;

    while (distanceFromEnd + segmentDistance >= nextSpawnDistance) {
      const distanceIntoReverseSegment = nextSpawnDistance - distanceFromEnd;
      const alphaBack = distanceIntoReverseSegment / segmentDistance;
      const spawnTime = current.t + (previous.t - current.t) * alphaBack;
      const age = roundSampleAge(endTimeSeconds - spawnTime);
      if (age > windowSeconds) return ages;
      ages.push(age);
      nextSpawnDistance += interval;
    }

    distanceFromEnd += segmentDistance;
  }

  return ages;
}

function sampleCarSpawnPerUnitAgesFromEmitterStart(
  timeline: ReplayTimeline,
  carId: string,
  endTimeSeconds: number,
  windowSeconds: number,
  interval: number,
  emitterStartTimeSeconds: number
) {
  if (timeline.frames.length === 0 || !(windowSeconds > 0)) return [];

  const timelineStart = timeline.frames[0].t;
  const timelineEnd = timeline.frames[timeline.frames.length - 1].t;
  const emitterStartTime = clamp(emitterStartTimeSeconds, timelineStart, timelineEnd);
  const endTime = clamp(endTimeSeconds, timelineStart, timelineEnd);
  const windowStartTime = clamp(endTime - windowSeconds, timelineStart, timelineEnd);
  if (endTime <= emitterStartTime) return [];

  const distanceAtEmitterStart = carCumulativeDistanceAt(timeline, carId, emitterStartTime);
  const distanceAtWindowStart = carCumulativeDistanceAt(timeline, carId, windowStartTime);
  const distanceSinceEmitterStart = Math.max(0, distanceAtWindowStart - distanceAtEmitterStart);
  const firstSpawnIndex = Math.max(1, Math.ceil((distanceSinceEmitterStart - 1e-6) / interval));
  let nextSpawnDistance = distanceAtEmitterStart + firstSpawnIndex * interval - distanceAtWindowStart;
  const { samples } = carWindowSamples(timeline, carId, endTime, endTime - windowStartTime);
  const ages: number[] = [];
  let cumulativeDistance = 0;

  if (nextSpawnDistance <= 1e-6 && windowStartTime < endTime) {
    ages.push(roundSampleAge(endTime - windowStartTime));
    nextSpawnDistance += interval;
  }

  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (!previous.position || !current.position) continue;

    const segmentDistance = vec3Distance(previous.position, current.position);
    if (segmentDistance <= 0) continue;

    while (cumulativeDistance + segmentDistance >= nextSpawnDistance) {
      const distanceIntoSegment = nextSpawnDistance - cumulativeDistance;
      const alpha = distanceIntoSegment / segmentDistance;
      const spawnTime = previous.t + (current.t - previous.t) * alpha;
      if (spawnTime >= windowStartTime && spawnTime < endTime) {
        ages.push(roundSampleAge(endTime - spawnTime));
      }
      nextSpawnDistance += interval;
    }

    cumulativeDistance += segmentDistance;
  }

  return ages.reverse();
}

function carCumulativeDistanceAt(timeline: ReplayTimeline, carId: string, timeSeconds: number): number {
  const track = carDistanceTrackForCar(timeline, carId);
  if (track.length === 0) return 0;
  if (timeSeconds <= track[0].t) return track[0].distance;
  const last = track[track.length - 1];
  if (timeSeconds >= last.t) return last.distance;

  let low = 0;
  let high = track.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (track[mid].t < timeSeconds) low = mid + 1;
    else high = mid - 1;
  }

  const previous = track[low - 1];
  const currentPosition = sampleCarForWindow(timeline, carId, timeSeconds)?.position;
  if (!previous.position || !currentPosition) return previous.distance;
  return previous.distance + vec3Distance(previous.position, currentPosition);
}

function carDistanceTrackForCar(timeline: ReplayTimeline, carId: string): CarDistanceSample[] {
  let timelineCache = carDistanceTrackCache.get(timeline);
  if (!timelineCache) {
    timelineCache = new Map();
    carDistanceTrackCache.set(timeline, timelineCache);
  }

  const cached = timelineCache.get(carId);
  if (cached) return cached;

  const track: CarDistanceSample[] = [];
  let distance = 0;
  let previous: [number, number, number] | undefined;

  for (const frame of timeline.frames) {
    const position = sampleCarForWindow(timeline, carId, frame.t)?.position;
    if (previous && position) distance += vec3Distance(previous, position);
    track.push({ t: frame.t, position, distance });
    previous = position;
  }

  timelineCache.set(carId, track);
  return track;
}

function carWindowSamples(timeline: ReplayTimeline, carId: string, endTimeSeconds: number, windowSeconds: number) {
  if (timeline.frames.length === 0 || !(windowSeconds > 0)) return { samples: [], distance: 0 };

  const startTime = clamp(endTimeSeconds - windowSeconds, timeline.frames[0].t, timeline.frames[timeline.frames.length - 1].t);
  const endTime = clamp(endTimeSeconds, timeline.frames[0].t, timeline.frames[timeline.frames.length - 1].t);
  if (endTime <= startTime) return { samples: [], distance: 0 };

  let distance = 0;
  const samples: Array<{ t: number; position: [number, number, number] | undefined }> = [];
  let previous: [number, number, number] | undefined;

  const appendSample = (sampleTime: number) => {
    const sample = {
      t: sampleTime,
      position: sampleCarForWindow(timeline, carId, sampleTime)?.position
    };
    samples.push(sample);
    const current = sample.position;
    if (previous && current) distance += vec3Distance(previous, current);
    previous = current;
  };

  appendSample(startTime);
  const [, firstInsideIndex] = findFramePairIndices(timeline.frames, startTime);
  const [lastInsideIndex] = findFramePairIndices(timeline.frames, endTime);
  for (let index = firstInsideIndex; index <= lastInsideIndex; index++) {
    const frame = timeline.frames[index];
    if (frame.t > startTime && frame.t < endTime) {
      appendSample(frame.t);
    }
  }
  appendSample(endTime);

  return { samples, distance };
}

function vec3Distance(a: [number, number, number], b: [number, number, number]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function roundSampleAge(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
