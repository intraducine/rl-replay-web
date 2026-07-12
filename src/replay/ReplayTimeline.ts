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
  demoWindows: Map<string, Array<{ start: number; end: number }>>;
};

type CarDistanceSample = {
  t: number;
  position: [number, number, number] | undefined;
  distance: number;
};

type CarWindowSamples = {
  samples: Array<{ t: number; position: [number, number, number] | undefined }>;
  distance: number;
};

const MOTION_EPSILON_SQ = 0.01;
const ROTATION_DOT_EPSILON = 0.99999;
const MAX_SMOOTH_SPAN_SECONDS = 1.25;
const CAR_RESET_DISTANCE = 1800;
const CAR_MAX_SPEED = 9000;
const BALL_RESET_DISTANCE = 2600;
const BALL_MAX_SPEED = 18000;
const DEMO_RESPAWN_FALLBACK_SECONDS = 3.05;
const DEMO_RESPAWN_MIN_TELEPORT_DISTANCE = 900;
const TIME_CURSOR_LINEAR_SCAN_LIMIT = 48;
const samplingIndexCache = new WeakMap<ReplayTimeline, TimelineSamplingIndex>();
const carDistanceTrackCache = new WeakMap<ReplayTimeline, Map<string, CarDistanceSample[]>>();
const atOrAfterTimeCursorCache = new WeakMap<ReadonlyArray<{ t: number }>, number>();
const afterTimeCursorCache = new WeakMap<ReadonlyArray<{ t: number }>, number>();

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
    camera: new Map(),
    demoWindows: new Map()
  };

  for (const frame of timeline.frames) {
    if (frame.ball) appendMotionKeyframe(index.ball, frame.t, frame.ball);

    for (const id in frame.cars) {
      if (!Object.prototype.hasOwnProperty.call(frame.cars, id)) continue;
      const car = frame.cars[id];
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

  for (const event of timeline.events) {
    if (event.type !== "demo" || !event.victimId) continue;
    let windows = index.demoWindows.get(event.victimId);
    if (!windows) {
      windows = [];
      index.demoWindows.set(event.victimId, windows);
    }
    windows.push({
      start: event.t,
      end: detectedRespawnTime(index.cars.get(event.victimId), event.t) ?? event.t + DEMO_RESPAWN_FALLBACK_SECONDS
    });
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

  const low = firstTimeIndexAtOrAfter(track, t);

  const next = track[low];
  const previous = track[low - 1];
  const span = next.t - previous.t;
  if (span <= 0) return previous.frame;

  const distance = Math.sqrt(positionDistanceSq(previous.frame, next.frame));
  if (distance > maxDistance || distance / span > maxSpeed) {
    return t < next.t ? previous.frame : next.frame;
  }
  if (span > MAX_SMOOTH_SPAN_SECONDS) return undefined;

  const previousFrame = frameWithEstimatedVelocity(track, low - 1, low - 2, low, maxSpeed);
  const nextFrame = frameWithEstimatedVelocity(track, low, low - 1, low + 1, maxSpeed);
  return interpolate(previousFrame, nextFrame, (t - previous.t) / span, span);
}

function frameWithEstimatedVelocity<T extends RigidBodyFrame>(
  track: MotionKeyframe<T>[],
  frameIndex: number,
  beforeIndex: number,
  afterIndex: number,
  maxSpeed: number
): T {
  const current = track[frameIndex].frame;
  if (current.velocity) return current;
  const before = track[beforeIndex] ?? track[frameIndex];
  const after = track[afterIndex] ?? track[frameIndex];

  const span = after.t - before.t;
  if (!(span > 0)) return current;
  const velocity: [number, number, number] = [
    (after.frame.position[0] - before.frame.position[0]) / span,
    (after.frame.position[1] - before.frame.position[1]) / span,
    (after.frame.position[2] - before.frame.position[2]) / span
  ];
  if (Math.hypot(...velocity) > maxSpeed) return current;
  return { ...current, velocity };
}

function findFramePairIndices(frames: TimelineFrame[], t: number): [number, number, number] {
  if (frames.length === 0) {
    throw new Error("Cannot sample an empty replay timeline.");
  }

  const clamped = clamp(t, frames[0].t, frames[frames.length - 1].t);
  const low = firstTimeIndexAtOrAfter(frames, clamped);

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

  for (const id in previous.cars) {
    if (!Object.prototype.hasOwnProperty.call(previous.cars, id)) continue;
    appendSampledCar(cars, samplingIndex, previous, next, id, sampledTime, alpha);
  }
  for (const id in next.cars) {
    if (
      !Object.prototype.hasOwnProperty.call(next.cars, id) ||
      Object.prototype.hasOwnProperty.call(previous.cars, id)
    ) {
      continue;
    }
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

export function samplePlayerBoostsAt(timeline: ReplayTimeline, playerIds: readonly string[], timeSeconds: number): Record<string, number | undefined> {
  const [previousIndex, nextIndex, alpha] = findFramePairIndices(timeline.frames, timeSeconds);
  const previous = timeline.frames[previousIndex];
  const next = timeline.frames[nextIndex];
  const boostByPlayer: Record<string, number | undefined> = {};
  const samplingIndex = buildSamplingIndex(timeline);

  for (const playerId of playerIds) {
    boostByPlayer[playerId] = isPlayerHiddenByDemo(samplingIndex, playerId, timeSeconds)
      ? 0
      : sampleBoostValue(previous.cars[playerId]?.boost, next.cars[playerId]?.boost, alpha);
  }

  return boostByPlayer;
}

function sampleBoostValue(previous: number | undefined, next: number | undefined, alpha: number) {
  if (previous === undefined && next === undefined) return 0;
  if (previous !== undefined && next !== undefined) return lerp(previous, next, alpha);
  return alpha < 0.5 ? previous ?? next : next ?? previous;
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
  if (car && !car.demolished && !isPlayerHiddenByDemo(samplingIndex, carId, sampledTime)) cars[carId] = car;
}

function detectedRespawnTime(track: MotionKeyframe<CarFrame>[] | undefined, demoTime: number): number | undefined {
  if (!track?.length) return undefined;
  const firstAfterDemo = firstTimeIndexAtOrAfter(track, demoTime);
  const anchor = track[Math.max(0, firstAfterDemo - 1)]?.frame;
  if (!anchor) return undefined;

  let sawDemolishedState = false;
  for (let index = firstAfterDemo; index < track.length; index++) {
    const keyframe = track[index];
    if (keyframe.frame.demolished) {
      sawDemolishedState = true;
      continue;
    }
    if (keyframe.t <= demoTime) continue;
    const teleported = Math.sqrt(positionDistanceSq(anchor, keyframe.frame)) >= DEMO_RESPAWN_MIN_TELEPORT_DISTANCE;
    if ((sawDemolishedState || teleported) && keyframe.t >= demoTime + 0.5) return keyframe.t;
  }
  return undefined;
}

function isPlayerHiddenByDemo(index: TimelineSamplingIndex, playerId: string, timeSeconds: number) {
  const windows = index.demoWindows.get(playerId);
  if (!windows) return false;
  for (const window of windows) {
    if (timeSeconds >= window.start && timeSeconds < window.end) return true;
  }
  return false;
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
  const samplingIndex = buildSamplingIndex(timeline);
  const car = sampleCarFromFramePair(samplingIndex, previous, next, carId, sampledTime, alpha);
  return car && !car.demolished && !isPlayerHiddenByDemo(samplingIndex, carId, sampledTime) ? car : undefined;
}

export function samplePlayerCameraState(timeline: ReplayTimeline, playerId: string | undefined, timeSeconds: number): ReplayCameraSample | undefined {
  if (!playerId) return undefined;
  const track = buildSamplingIndex(timeline).camera.get(playerId);
  if (!track?.length) return undefined;
  if (timeSeconds <= track[0].t) return track[0];
  if (timeSeconds >= track[track.length - 1].t) return track[track.length - 1];

  const low = firstTimeIndexAfter(track, timeSeconds);
  const high = low - 1;

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

export function sampleCarDistanceAndSpawnPerUnitAgesWindow(
  timeline: ReplayTimeline,
  carId: string,
  endTimeSeconds: number,
  windowSeconds: number,
  spawnPerUnit: number,
  spawnRateScalar: number,
  emitterStartTimeSeconds?: number
): { distance: number; spawnAges: number[] } {
  const interval = 1 / (spawnPerUnit * spawnRateScalar);
  const window = carWindowSamples(timeline, carId, endTimeSeconds, windowSeconds);
  if (!(interval > 0)) return { distance: window.distance, spawnAges: [] };

  const spawnAges =
    typeof emitterStartTimeSeconds === "number"
      ? sampleCarSpawnPerUnitAgesFromEmitterStart(
          timeline,
          carId,
          endTimeSeconds,
          windowSeconds,
          interval,
          emitterStartTimeSeconds,
          window
        )
      : sampleCarSpawnPerUnitAgesFromWindowSamples(window.samples, endTimeSeconds, windowSeconds, interval);

  return { distance: window.distance, spawnAges };
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

  return sampleCarSpawnPerUnitAgesFromWindowSamples(carWindowSamples(timeline, carId, endTimeSeconds, windowSeconds, false).samples, endTimeSeconds, windowSeconds, interval);
}

function sampleCarSpawnPerUnitAgesFromWindowSamples(
  samples: CarWindowSamples["samples"],
  endTimeSeconds: number,
  windowSeconds: number,
  interval: number
) {
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
  emitterStartTimeSeconds: number,
  window?: CarWindowSamples
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
  const { samples } = window ?? carWindowSamples(timeline, carId, endTime, endTime - windowStartTime);
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

  const low = firstTimeIndexAtOrAfter(track, timeSeconds);

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

function carWindowSamples(timeline: ReplayTimeline, carId: string, endTimeSeconds: number, windowSeconds: number, measureDistance = true): CarWindowSamples {
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
    if (measureDistance && previous && current) distance += vec3Distance(previous, current);
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

function firstTimeIndexAtOrAfter<T extends { t: number }>(samples: readonly T[], timeSeconds: number): number {
  return firstTimeIndex(samples, timeSeconds, atOrAfterTimeCursorCache, (sampleTime, targetTime) => sampleTime < targetTime);
}

function firstTimeIndexAfter<T extends { t: number }>(samples: readonly T[], timeSeconds: number): number {
  return firstTimeIndex(samples, timeSeconds, afterTimeCursorCache, (sampleTime, targetTime) => sampleTime <= targetTime);
}

function firstTimeIndex<T extends { t: number }>(
  samples: readonly T[],
  timeSeconds: number,
  cursorCache: WeakMap<ReadonlyArray<{ t: number }>, number>,
  isBeforeTarget: (sampleTime: number, targetTime: number) => boolean
): number {
  if (samples.length === 0) return 0;

  const cached = cursorCache.get(samples);
  if (cached !== undefined) {
    let index = clamp(cached, 0, samples.length - 1);
    let scanned = 0;
    if (isBeforeTarget(samples[index].t, timeSeconds)) {
      while (index < samples.length - 1 && isBeforeTarget(samples[index].t, timeSeconds)) {
        index++;
        scanned++;
        if (scanned > TIME_CURSOR_LINEAR_SCAN_LIMIT) return firstTimeIndexBinary(samples, timeSeconds, cursorCache, isBeforeTarget);
      }
    } else {
      while (index > 0 && !isBeforeTarget(samples[index - 1].t, timeSeconds)) {
        index--;
        scanned++;
        if (scanned > TIME_CURSOR_LINEAR_SCAN_LIMIT) return firstTimeIndexBinary(samples, timeSeconds, cursorCache, isBeforeTarget);
      }
    }
    cursorCache.set(samples, index);
    return index;
  }

  return firstTimeIndexBinary(samples, timeSeconds, cursorCache, isBeforeTarget);
}

function firstTimeIndexBinary<T extends { t: number }>(
  samples: readonly T[],
  timeSeconds: number,
  cursorCache: WeakMap<ReadonlyArray<{ t: number }>, number>,
  isBeforeTarget: (sampleTime: number, targetTime: number) => boolean
): number {
  let low = 0;
  let high = samples.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (isBeforeTarget(samples[mid].t, timeSeconds)) low = mid + 1;
    else high = mid - 1;
  }

  const index = clamp(low, 0, samples.length - 1);
  cursorCache.set(samples, index);
  return index;
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
