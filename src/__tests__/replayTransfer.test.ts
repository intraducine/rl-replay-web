import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareTimelineForTransfer } from "../replay/ReplayTransfer";
import type { ReplayTimeline, TimelineFrame } from "../replay/types";

describe("prepareTimelineForTransfer", () => {
  it("rounds high precision replay floats before worker transfer", () => {
    const timeline: ReplayTimeline = {
      version: 1,
      metadata: {
        id: "replay-1",
        fileName: "sample.replay",
        durationSeconds: 123.456789,
        createdAt: 1234.56,
        parserVersion: "test",
        source: "wasm",
        players: [],
        teams: []
      },
      frames: [
        {
          t: 1.23456789,
          ball: {
            position: [1.234567, 2.345678, 3.456789],
            rotation: [0.1234567, 0.2345678, 0.3456789, 0.4567891],
            velocity: [100.123456, 200.234567, 300.345678]
          },
          cars: {
            car1: {
              position: [4.56789, 5.67891, 6.78912],
              rotation: [0.1111111, 0.2222222, 0.3333333, 0.4444444],
              velocity: [400.45678, 500.56789, 600.67891],
              boost: 42.98765,
              boostActive: true
            }
          }
        }
      ],
      events: [{ type: "shot", t: 7.891234, playerId: "car1" }]
    };

    expect(prepareTimelineForTransfer(timeline)).toStrictEqual({
      version: 1,
      metadata: {
        id: "replay-1",
        fileName: "sample.replay",
        durationSeconds: 123.457,
        createdAt: 1235,
        parserVersion: "test",
        source: "wasm",
        players: [],
        teams: []
      },
      frames: [
        {
          t: 1.235,
          ball: {
            position: [1.23, 2.35, 3.46],
            rotation: [0.12346, 0.23457, 0.34568, 0.45679],
            velocity: [100.12, 200.23, 300.35],
            angularVelocity: undefined
          },
          cars: {
            car1: {
              position: [4.57, 5.68, 6.79],
              rotation: [0.11111, 0.22222, 0.33333, 0.44444],
              velocity: [400.46, 500.57, 600.68],
              angularVelocity: undefined,
              boost: 42.99,
              boostActive: true,
              demolished: undefined,
              supersonic: undefined
            }
          }
        }
      ],
      events: [{ type: "shot", t: 7.891, playerId: "car1" }]
    });
  });

  it("substantially shrinks overprecise timeline JSON", () => {
    const preciseFrame = {
      t: 1.123456789,
      cars: {
        car1: {
          position: [1234.123456789, 2345.234567891, 3456.345678912],
          rotation: [0.123456789, 0.234567891, 0.345678912, 0.456789123],
          velocity: [10.123456789, 20.234567891, 30.345678912],
          boost: 99.123456789
        }
      }
    } satisfies TimelineFrame;
    const timeline: ReplayTimeline = {
      version: 1,
      metadata: {
        id: "replay-1",
        fileName: "sample.replay",
        durationSeconds: 1.123456789,
        createdAt: 1,
        parserVersion: "test",
        players: [],
        teams: []
      },
      frames: Array.from({ length: 50 }, () => preciseFrame),
      events: []
    };

    const rawLength = JSON.stringify(timeline).length;
    const preparedLength = JSON.stringify(prepareTimelineForTransfer(timeline)).length;

    expect(preparedLength).toBeLessThan(rawLength * 0.75);
  });

  it("prepares frame cars without chained entry allocation", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTransfer.ts"), "utf8");
    const prepareFrameSource = source.match(/function prepareFrameForTransfer[\s\S]*?\n}\n\nfunction prepareRigidBodyForTransfer/)?.[0] ?? "";

    expect(prepareFrameSource).toContain("for (const id in frame.cars)");
    expect(prepareFrameSource).toContain("Object.prototype.hasOwnProperty.call(frame.cars, id)");
    expect(prepareFrameSource).toContain("cars[id] = prepareCarForTransfer(frame.cars[id])");
    expect(prepareFrameSource).not.toContain("Object.entries(frame.cars)");
    expect(prepareFrameSource).not.toContain("Object.fromEntries");
  });
});
