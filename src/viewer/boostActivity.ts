import type { ReplayTimeline } from "../replay/types";

const BOOST_LOOKBACK_SECONDS = 0.12;
const BOOST_DRAIN_THRESHOLD = 0.35;

type BoostSegment = { start: number; end: number };

const boostSegmentCache = new WeakMap<ReplayTimeline, Map<string, BoostSegment[]>>();

export function isCarBoostingAt(timeline: ReplayTimeline, carId: string, time: number): boolean {
  return carBoostSegmentAt(timeline, carId, time) !== undefined;
}

export function carBoostSegmentStartTime(timeline: ReplayTimeline, carId: string, time: number): number {
  const segment = carBoostSegmentAt(timeline, carId, time);
  return segment?.start ?? time;
}

export function carBoostSegmentAt(timeline: ReplayTimeline, carId: string, time: number): BoostSegment | undefined {
  const segments = boostSegmentsForCar(timeline, carId);
  if (segments.length === 0) return undefined;

  let low = 0;
  let high = segments.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const segment = segments[mid];
    if (time < segment.start) {
      high = mid - 1;
    } else if (!isTimeInBoostSegment(timeline, segment, time)) {
      low = mid + 1;
    } else {
      return segment;
    }
  }

  return undefined;
}

function isTimeInBoostSegment(timeline: ReplayTimeline, segment: BoostSegment, time: number) {
  if (time < segment.start) return false;
  if (time < segment.end) return true;
  return time === segment.end && segment.end === timelineEndTime(timeline);
}

function boostSegmentsForCar(timeline: ReplayTimeline, carId: string): BoostSegment[] {
  let timelineCache = boostSegmentCache.get(timeline);
  if (!timelineCache) {
    timelineCache = new Map();
    boostSegmentCache.set(timeline, timelineCache);
  }

  const cached = timelineCache.get(carId);
  if (cached) return cached;

  const replicatedSegments = replicatedBoostSegmentsForCar(timeline, carId);
  const segments = replicatedSegments ?? inferredBoostDrainSegmentsForCar(timeline, carId);
  timelineCache.set(carId, segments);
  return segments;
}

function replicatedBoostSegmentsForCar(timeline: ReplayTimeline, carId: string): BoostSegment[] | undefined {
  const segments: BoostSegment[] = [];
  let activeStart: number | undefined;
  let hasReplicatedBoostActive = false;

  for (const frame of timeline.frames) {
    const boostActive = frame.cars[carId]?.boostActive;
    if (boostActive !== undefined) hasReplicatedBoostActive = true;
    const boosting = boostActive === true;
    if (boosting && activeStart === undefined) {
      activeStart = frame.t;
    } else if (!boosting && activeStart !== undefined) {
      segments.push({ start: activeStart, end: frame.t });
      activeStart = undefined;
    }
  }

  if (activeStart !== undefined) {
    segments.push({ start: activeStart, end: timelineEndTime(timeline) });
  }

  return hasReplicatedBoostActive ? segments : undefined;
}

function inferredBoostDrainSegmentsForCar(timeline: ReplayTimeline, carId: string): BoostSegment[] {
  const samples: Array<{ t: number; boost: number }> = [];
  const segments: BoostSegment[] = [];
  let activeStart: number | undefined;
  let lookbackIndex = 0;

  for (const frame of timeline.frames) {
    const boost = frame.cars[carId]?.boost;
    if (typeof boost !== "number") continue;

    const sample = { t: frame.t, boost };
    const index = samples.length;
    samples.push(sample);

    while (lookbackIndex < index && samples[lookbackIndex + 1].t <= sample.t - BOOST_LOOKBACK_SECONDS) {
      lookbackIndex++;
    }

    const previous = samples[Math.max(0, lookbackIndex)];
    const boosting = previous !== sample && previous.boost - sample.boost > BOOST_DRAIN_THRESHOLD;
    if (boosting && activeStart === undefined) {
      activeStart = sample.t;
    } else if (!boosting && activeStart !== undefined) {
      segments.push({ start: activeStart, end: sample.t });
      activeStart = undefined;
    }
  }

  if (activeStart !== undefined) {
    segments.push({ start: activeStart, end: timelineEndTime(timeline) });
  }

  return segments;
}

function timelineEndTime(timeline: ReplayTimeline) {
  return timeline.frames.at(-1)?.t ?? timeline.metadata.durationSeconds;
}
