import type { ReplayTimeline } from "../replay/types";

const BOOST_LOOKBACK_SECONDS = 0.12;
const BOOST_DRAIN_THRESHOLD = 0.35;

type BoostSegment = { start: number; end: number };

const boostSegmentCache = new WeakMap<ReplayTimeline, Map<string, BoostSegment[]>>();

export function isCarBoostingAt(timeline: ReplayTimeline, carId: string, time: number): boolean {
  return boostSegmentAt(timeline, carId, time) !== undefined;
}

export function carBoostSegmentStartTime(timeline: ReplayTimeline, carId: string, time: number): number {
  const segment = boostSegmentAt(timeline, carId, time);
  return segment?.start ?? time;
}

function boostSegmentAt(timeline: ReplayTimeline, carId: string, time: number) {
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

  const segments = timelineHasReplicatedBoostActive(timeline, carId)
    ? replicatedBoostSegmentsForCar(timeline, carId)
    : inferredBoostDrainSegmentsForCar(timeline, carId);
  timelineCache.set(carId, segments);
  return segments;
}

function timelineHasReplicatedBoostActive(timeline: ReplayTimeline, carId: string) {
  return timeline.frames.some((frame) => frame.cars[carId]?.boostActive !== undefined);
}

function replicatedBoostSegmentsForCar(timeline: ReplayTimeline, carId: string): BoostSegment[] {
  const segments: BoostSegment[] = [];
  let activeStart: number | undefined;

  for (const frame of timeline.frames) {
    const boosting = frame.cars[carId]?.boostActive === true;
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

  return segments;
}

function inferredBoostDrainSegmentsForCar(timeline: ReplayTimeline, carId: string): BoostSegment[] {
  const samples = timeline.frames
    .map((frame) => ({ t: frame.t, boost: frame.cars[carId]?.boost }))
    .filter((sample): sample is { t: number; boost: number } => typeof sample.boost === "number");
  const segments: BoostSegment[] = [];
  let activeStart: number | undefined;
  let lookbackIndex = 0;

  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
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
