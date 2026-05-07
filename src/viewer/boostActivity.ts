import { sampleTimeline } from "../replay/ReplayTimeline";
import type { ReplayTimeline } from "../replay/types";

const BOOST_LOOKBACK_SECONDS = 0.12;
const BOOST_DRAIN_THRESHOLD = 0.35;
const boostSegmentCache = new WeakMap<ReplayTimeline, Map<string, Array<{ start: number; end: number }>>>();

export function isCarBoostingAt(timeline: ReplayTimeline, carId: string, time: number): boolean {
  const currentCar = sampleTimeline(timeline, time).cars[carId];
  if (currentCar?.boostActive !== undefined) return currentCar.boostActive;

  const current = currentCar?.boost;
  const previous = sampleTimeline(timeline, Math.max(0, time - BOOST_LOOKBACK_SECONDS)).cars[carId]?.boost;
  if (current === undefined || previous === undefined) return false;
  return previous - current > BOOST_DRAIN_THRESHOLD;
}

export function carBoostSegmentStartTime(timeline: ReplayTimeline, carId: string, time: number): number {
  if (!isCarBoostingAt(timeline, carId, time)) return time;

  const segments = boostSegmentsForCar(timeline, carId);
  const segment = segments.find((candidate) => candidate.start <= time && time <= candidate.end);
  return segment?.start ?? time;
}

function boostSegmentsForCar(timeline: ReplayTimeline, carId: string) {
  let timelineCache = boostSegmentCache.get(timeline);
  if (!timelineCache) {
    timelineCache = new Map();
    boostSegmentCache.set(timeline, timelineCache);
  }

  const cached = timelineCache.get(carId);
  if (cached) return cached;

  const segments: Array<{ start: number; end: number }> = [];
  let activeStart: number | undefined;

  for (const frame of timeline.frames) {
    const boosting = isCarBoostingAt(timeline, carId, frame.t);
    if (boosting && activeStart === undefined) {
      activeStart = frame.t;
    } else if (!boosting && activeStart !== undefined) {
      segments.push({ start: activeStart, end: frame.t });
      activeStart = undefined;
    }
  }

  if (activeStart !== undefined) {
    segments.push({ start: activeStart, end: timeline.frames.at(-1)?.t ?? timeline.metadata.durationSeconds });
  }

  timelineCache.set(carId, segments);
  return segments;
}
