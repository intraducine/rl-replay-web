import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rlPositionToThree, rlQuatToThree, transformRigidBodyToThree } from "../math/coordinateSystem";
import { normalizeTimelineCoordinates } from "../replay/ReplayNormalizer";
import type { ReplayTimeline } from "../replay/types";

describe("coordinate conversion", () => {
  it("maps Rocket League Z-up coordinates into Three.js Y-up coordinates", () => {
    expect(rlPositionToThree([100, 200, 300])).toEqual([100, 300, -200]);
  });

  it("maps Rocket League Z-axis yaw into Three.js Y-axis yaw", () => {
    expect(rlQuatToThree([0, 0, 0.7071, 0.7071])).toEqual([0, 0.7071, -0, 0.7071]);
  });

  it("applies debug axis inversions after the base conversion", () => {
    const frame = transformRigidBodyToThree(
      { position: [1, 2, 3], rotation: [0.1, 0.2, 0.3, 0.4] },
      { invertX: true, invertZ: true, invertQuatW: true }
    );

    expect(frame.position).toEqual([-1, 3, 2]);
    expect(frame.rotation).toEqual([0.1, 0.3, -0.2, -0.4]);
  });

  it("normalizes replay car coordinates without chained entry allocation", () => {
    const timeline: ReplayTimeline = {
      version: 1,
      metadata: { id: "coords", players: [] },
      events: [],
      frames: [
        {
          t: 0,
          ball: { position: [10, 20, 30], rotation: [0, 0, 0, 1] },
          cars: {
            p1: { position: [100, 200, 300], rotation: [0, 0, 0.7071, 0.7071], velocity: [1, 2, 3] }
          }
        }
      ]
    };
    const normalized = normalizeTimelineCoordinates(timeline);
    const normalizerSource = readFileSync(resolve(process.cwd(), "src/replay/ReplayNormalizer.ts"), "utf8");

    expect(normalized.frames[0].cars.p1.position).toEqual([100, 300, -200]);
    expect(normalized.frames[0].cars.p1.rotation).toEqual([0, 0.7071, -0, 0.7071]);
    expect(normalized.frames[0].cars.p1.velocity).toEqual([1, 3, -2]);
    expect(normalized.frames[0].ball?.position).toEqual([10, 30, -20]);
    expect(normalizerSource).toContain("for (const id in frame.cars)");
    expect(normalizerSource).toContain("Object.prototype.hasOwnProperty.call(frame.cars, id)");
    expect(normalizerSource).not.toContain("Object.entries(frame.cars)");
    expect(normalizerSource).not.toContain("Object.fromEntries");
  });
});
