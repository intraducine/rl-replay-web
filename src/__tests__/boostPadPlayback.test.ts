import { describe, expect, it } from "vitest";
import { standardArenaBoostPads } from "../replay/standardArenaBoostPads";
import type { ReplayTimeline, TimelineFrame } from "../replay/types";
import {
  LARGE_BOOST_RESPAWN_SECONDS,
  SMALL_BOOST_AMOUNT,
  SMALL_BOOST_RESPAWN_SECONDS,
  boostPadPlaybackStateAt,
  inferBoostPadPickups
} from "../viewer/boostPadPlayback";

const metadata: ReplayTimeline["metadata"] = {
  id: "boost-pad-test",
  fileName: "boost-pad-test.replay",
  durationSeconds: 20,
  createdAt: 0,
  parserVersion: "test",
  players: []
};

describe("boost pad playback", () => {
  it("uses Rocket League pickup amounts and respawn timings", () => {
    expect(SMALL_BOOST_AMOUNT).toBe(12);
    expect(SMALL_BOOST_RESPAWN_SECONDS).toBe(4);
    expect(LARGE_BOOST_RESPAWN_SECONDS).toBe(10);
  });

  it("infers a small-pad pickup from a nearby twelve-boost gain", () => {
    const timeline = replay([
      frame(0, [-1200, 18, 0], 20),
      frame(0.1, [-1024, 18, 0], 32)
    ]);

    expect(inferBoostPadPickups(timeline).get(16)?.[0]).toMatchObject({ padId: 16, playerId: "p1" });
  });

  it("infers a full-pad pickup and keeps it depleted for ten seconds", () => {
    const pad = standardArenaBoostPads.find((candidate) => candidate.id === 15)!;
    const timeline = replay([
      frame(0, [-3760, 18, 0], 22),
      frame(0.1, [-3584, 18, 0], 100)
    ]);
    const pickups = inferBoostPadPickups(timeline).get(pad.id);
    const pickupTime = pickups?.[0].t ?? 0;

    expect(pickups).toHaveLength(1);
    expect(boostPadPlaybackStateAt(pad, pickups, pickupTime + 5).active).toBe(false);
    expect(boostPadPlaybackStateAt(pad, pickups, pickupTime + 10.2)).toMatchObject({ active: true, energy: 1 });
  });

  it("restores a small pad after four seconds and supports deterministic backward seeks", () => {
    const pad = standardArenaBoostPads.find((candidate) => candidate.id === 16)!;
    const pickups = [{ padId: pad.id, playerId: "p1", t: 2 }];

    expect(boostPadPlaybackStateAt(pad, pickups, 3).active).toBe(false);
    expect(boostPadPlaybackStateAt(pad, pickups, 6.2).active).toBe(true);
    expect(boostPadPlaybackStateAt(pad, pickups, 1).active).toBe(true);
  });

  it("ignores boost gains when the car is not crossing a pad", () => {
    const timeline = replay([
      frame(0, [500, 18, 500], 20),
      frame(0.1, [600, 18, 600], 32)
    ]);

    expect(inferBoostPadPickups(timeline).size).toBe(0);
  });
});

function replay(frames: TimelineFrame[]): ReplayTimeline {
  return { version: 1, metadata, frames, events: [] };
}

function frame(t: number, position: [number, number, number], boost: number): TimelineFrame {
  return {
    t,
    cars: {
      p1: { position, rotation: [0, 0, 0, 1], boost }
    }
  };
}
