import { describe, expect, it } from "vitest";
import type { ReplayTimeline } from "../replay/types";
import { carBoostSegmentStartTime, isCarBoostingAt } from "../viewer/boostActivity";

const baseTimeline = {
  version: 1,
  metadata: {
    id: "test",
    fileName: "test.replay",
    durationSeconds: 1,
    createdAt: 0,
    parserVersion: "test",
    source: "mock",
    players: [{ id: "p1", name: "Player", team: 0 }]
  },
  events: []
} satisfies Omit<ReplayTimeline, "frames">;

describe("isCarBoostingAt", () => {
  it("returns true while a car boost amount is draining", () => {
    const timeline: ReplayTimeline = {
      ...baseTimeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 50 } } },
        { t: 0.1, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 42 } } },
        { t: 0.2, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 34 } } }
      ]
    };

    expect(isCarBoostingAt(timeline, "p1", 0.16)).toBe(true);
  });

  it("returns false when boost is steady or increasing", () => {
    const timeline: ReplayTimeline = {
      ...baseTimeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 20 } } },
        { t: 0.1, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 20 } } },
        { t: 0.2, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 32 } } }
      ]
    };

    expect(isCarBoostingAt(timeline, "p1", 0.08)).toBe(false);
    expect(isCarBoostingAt(timeline, "p1", 0.18)).toBe(false);
  });

  it("uses replicated boost active when present instead of amount drain inference", () => {
    const timeline: ReplayTimeline = {
      ...baseTimeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100, boostActive: false } } },
        { t: 0.1, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 90, boostActive: false } } },
        { t: 0.2, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 80, boostActive: false } } }
      ]
    };

    expect(isCarBoostingAt(timeline, "p1", 0.16)).toBe(false);
  });

  it("finds the current replicated boost active segment start", () => {
    const timeline: ReplayTimeline = {
      ...baseTimeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100, boostActive: false } } },
        { t: 0.1, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100, boostActive: true } } },
        { t: 0.2, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100, boostActive: true } } },
        { t: 0.3, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100, boostActive: false } } }
      ]
    };

    expect(isCarBoostingAt(timeline, "p1", 0.2)).toBe(true);
    expect(carBoostSegmentStartTime(timeline, "p1", 0.2)).toBe(0.1);
  });

  it("finds the first sampled time in the current boost drain segment", () => {
    const timeline: ReplayTimeline = {
      ...baseTimeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100 } } },
        { t: 0.1, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100 } } },
        { t: 0.2, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 90 } } },
        { t: 0.3, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 80 } } },
        { t: 0.4, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 80 } } }
      ]
    };

    expect(carBoostSegmentStartTime(timeline, "p1", 0.3)).toBe(0.2);
  });
});
