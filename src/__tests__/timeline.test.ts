import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  sampleCarDistanceAndSpawnPerUnitAgesWindow,
  sampleCarDistanceWindow,
  sampleCarSpawnPerUnitAgesWindow,
  samplePlayerBoostsAt,
  samplePlayerCameraState,
  sampleTimeline
} from "../replay/ReplayTimeline";
import type { ReplayTimeline } from "../replay/types";

const timeline: ReplayTimeline = {
  version: 1,
  metadata: {
    id: "test",
    fileName: "test.replay",
    durationSeconds: 2,
    createdAt: 0,
    parserVersion: "test",
    players: [{ id: "p1", name: "Blue", team: 0 }]
  },
  events: [],
  frames: [
    {
      t: 0,
      ball: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
      cars: {
        p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 50 }
      }
    },
    {
      t: 2,
      ball: { position: [2, 4, 6], rotation: [0, 1, 0, 0] },
      cars: {}
    }
  ]
};

function distance(a: [number, number, number], b: [number, number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe("sampleTimeline", () => {
  it("samples player camera state as the latest replay camera update", () => {
    const cameraTimeline: ReplayTimeline = {
      ...timeline,
      camera: [
        {
          t: 0,
          playerId: "p1",
          usingSecondaryCamera: false,
          settings: { fov: 110, height: 100, angle: -3, distance: 270, stiffness: 0.35, swivel: 7, transition: 1.5 }
        },
        { t: 1, playerId: "p1", usingSecondaryCamera: true },
        { t: 1.5, playerId: "p1", usingSecondaryCamera: false, cameraYaw: 140 }
      ]
    };

    expect(samplePlayerCameraState(cameraTimeline, "p1", 0.5)).toMatchObject({
      usingSecondaryCamera: false,
      settings: { distance: 270, height: 100 }
    });
    expect(samplePlayerCameraState(cameraTimeline, "p1", 1.25)).toMatchObject({
      usingSecondaryCamera: true,
      settings: { distance: 270, height: 100 }
    });
    expect(samplePlayerCameraState(cameraTimeline, "p1", 1.75)).toMatchObject({
      usingSecondaryCamera: false,
      cameraYaw: 140,
      settings: { distance: 270, height: 100 }
    });
  });

  it("smoothly interpolates numeric player camera settings between replay camera samples", () => {
    const cameraTimeline: ReplayTimeline = {
      ...timeline,
      camera: [
        {
          t: 0,
          playerId: "p1",
          usingSecondaryCamera: true,
          settings: { fov: 100, height: 80, angle: -4, distance: 240, stiffness: 0.2, swivel: 5, transition: 1 }
        },
        {
          t: 1,
          playerId: "p1",
          usingSecondaryCamera: false,
          settings: { fov: 110, height: 120, angle: -2, distance: 320, stiffness: 0.4, swivel: 9, transition: 2 }
        }
      ]
    };

    const sample = samplePlayerCameraState(cameraTimeline, "p1", 0.5);

    expect(sample).toMatchObject({
      usingSecondaryCamera: true,
      settings: {
        fov: 105,
        height: 100,
        angle: -3,
        distance: 280,
        swivel: 7,
        transition: 1.5
      }
    });
    expect(sample?.settings?.stiffness).toBeCloseTo(0.3);
  });

  it("keeps camera interpolation on numeric settings instead of replay camera toggles", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");

    expect(source).toContain("function interpolateCameraSettings");
    expect(source).toContain("settings: interpolateCameraSettings(previous.settings, next.settings");
    expect(source).toContain("return {\n    ...previous,");
  });

  it("linearly interpolates positions", () => {
    const sample = sampleTimeline(timeline, 1);
    expect(sample.ball?.position).toEqual([1, 2, 3]);
  });

  it("holds the nearest car state when one frame is missing it", () => {
    const sample = sampleTimeline(timeline, 1.5);
    expect(sample.cars.p1.position).toEqual([0, 0, 0]);
    expect(sample.cars.p1.boost).toBe(50);
  });

  it("interpolates car motion across repeated held frames", () => {
    const heldTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 20 } } },
        { t: 0.033, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 30 } } },
        { t: 0.066, cars: { p1: { position: [20, 10, 0], rotation: [0, 0, 0, 1], boost: 40 } } }
      ]
    };

    const sample = sampleTimeline(heldTimeline, 0.033);

    expect(sample.cars.p1.position[0]).toBeCloseTo(10);
    expect(sample.cars.p1.position[1]).toBeCloseTo(5);
    expect(sample.cars.p1.boost).toBe(30);
  });

  it("keeps car motion on the same interpolation track when entering a changed pose", () => {
    const heldTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 20 } } },
        { t: 1 / 30, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 30 } } },
        { t: 2 / 30, cars: { p1: { position: [30, 0, 0], rotation: [0, 0, 0, 1], boost: 40 } } }
      ]
    };

    const sample = sampleTimeline(heldTimeline, 1.5 / 30);

    expect(sample.cars.p1.position[0]).toBeCloseTo(22.5);
    expect(sample.cars.p1.boost).toBeCloseTo(35);
  });

  it("smoothly interpolates car motion across modest replay sample gaps", () => {
    const sparseTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 80 } } },
        { t: 0.5, cars: { p1: { position: [500, 0, 0], rotation: [0, 0, 0, 1], boost: 60 } } }
      ]
    };

    const sample = sampleTimeline(sparseTimeline, 0.25);

    expect(sample.cars.p1.position[0]).toBeCloseTo(250);
    expect(sample.cars.p1.boost).toBeCloseTo(70);
  });

  it.each([0.25, 1])("produces continuous render-rate car and ball samples at %sx playback", (playbackSpeed) => {
    const frameDuration = 1 / 30;
    const renderDuration = 1 / 60;
    const movingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [0, 1, 2, 3].map((frame) => ({
        t: frame * frameDuration,
        ball: {
          position: [frame * 30, 0, 0],
          rotation: [0, 0, 0, 1],
          velocity: [900, 0, 0]
        },
        cars: {
          p1: {
            position: [frame * 30, 0, 0],
            rotation: [0, 0, 0, 1],
            velocity: [900, 0, 0]
          }
        }
      }))
    };

    let previous = sampleTimeline(movingTimeline, 0);
    for (let renderFrame = 1; renderFrame <= 6 / playbackSpeed; renderFrame++) {
      const current = sampleTimeline(movingTimeline, renderFrame * renderDuration * playbackSpeed);
      const expectedStep = 900 * renderDuration * playbackSpeed;
      expect(current.ball!.position[0] - previous.ball!.position[0]).toBeCloseTo(expectedStep, 4);
      expect(current.cars.p1.position[0] - previous.cars.p1.position[0]).toBeCloseTo(expectedStep, 4);
      previous = current;
    }
  });

  it("smooths alternating held poses from the bundled replay instead of hopping on network updates", () => {
    // Extracted from cd2c5d33-422a-4d11-b6ca-9d827c5d26fe at 20.011–20.145s.
    const carPositions = [
      [-1490.24, 4300.47, 51.47],
      [-1490.24, 4300.47, 51.47],
      [-1536.05, 4368.36, 30.96],
      [-1536.05, 4368.36, 30.96],
      [-1586.14, 4416.49, 16.65]
    ] as const;
    const ballPositions = [
      [832.69, 4536.48, 93.08],
      [903.79, 4563.59, 93.88],
      [939.32, 4577.13, 94.01],
      [992.58, 4597.44, 93.85],
      [1098.66, 4637.85, 93.3]
    ] as const;
    const replayExcerpt: ReplayTimeline = {
      ...timeline,
      frames: carPositions.map((position, index) => ({
        t: index / 30,
        ball: { position: [...ballPositions[index]], rotation: [0, 0, 0, 1] },
        cars: { p1: { position: [...position], rotation: [0, 0, 0, 1] } }
      }))
    };

    const samples = Array.from({ length: 9 }, (_, index) => sampleTimeline(replayExcerpt, index / 60));
    const carSteps = samples.slice(1).map((sample, index) => distance(sample.cars.p1.position, samples[index].cars.p1.position));
    const ballSteps = samples.slice(1).map((sample, index) => distance(sample.ball!.position, samples[index].ball!.position));

    expect(carSteps.every((step) => step > 1)).toBe(true);
    expect(Math.max(...carSteps) / Math.min(...carSteps)).toBeLessThan(1.5);
    expect(ballSteps.every((step) => step > 1)).toBe(true);
  });

  it("keeps position interpolation continuous across rotation-only network updates", () => {
    const rotatingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        {
          t: 0,
          ball: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
          cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } }
        },
        {
          t: 1 / 30,
          ball: { position: [0, 0, 0], rotation: [0, 0, 0.382683, 0.92388] },
          cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0.382683, 0.92388] } }
        },
        {
          t: 2 / 30,
          ball: { position: [20, 0, 0], rotation: [0, 0, 0.707107, 0.707107] },
          cars: { p1: { position: [20, 0, 0], rotation: [0, 0, 0.707107, 0.707107] } }
        }
      ]
    };

    const sample = sampleTimeline(rotatingTimeline, 1 / 30);

    expect(sample.cars.p1.position[0]).toBeCloseTo(10);
    expect(sample.cars.p1.rotation[2]).toBeCloseTo(0.382683, 5);
    expect(sample.cars.p1.rotation[3]).toBeCloseTo(0.92388, 5);
    expect(sample.ball?.position[0]).toBeCloseTo(10);
    expect(sample.ball?.rotation[2]).toBeCloseTo(0.382683, 5);
  });

  it("keeps rotation interpolation continuous across position-only network updates", () => {
    const movingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        {
          t: 0,
          ball: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
          cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } }
        },
        {
          t: 1 / 30,
          ball: { position: [10, 0, 0], rotation: [0, 0, 0, 1] },
          cars: { p1: { position: [10, 0, 0], rotation: [0, 0, 0, 1] } }
        },
        {
          t: 2 / 30,
          ball: { position: [20, 0, 0], rotation: [0, 0, 0.707107, 0.707107] },
          cars: { p1: { position: [20, 0, 0], rotation: [0, 0, 0.707107, 0.707107] } }
        }
      ]
    };

    const sample = sampleTimeline(movingTimeline, 1 / 30);

    expect(sample.cars.p1.position[0]).toBeCloseTo(10);
    expect(sample.cars.p1.rotation[2]).toBeCloseTo(0.382683, 5);
    expect(sample.cars.p1.rotation[3]).toBeCloseTo(0.92388, 5);
    expect(sample.ball?.position[0]).toBeCloseTo(10);
    expect(sample.ball?.rotation[2]).toBeCloseTo(0.382683, 5);
  });

  it("uses endpoint velocities to smooth position interpolation when available", () => {
    const velocityTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        {
          t: 0,
          ball: { position: [0, 0, 0], rotation: [0, 0, 0, 1], velocity: [0, 0, 0] },
          cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], velocity: [0, 0, 0] } }
        },
        {
          t: 0.5,
          ball: { position: [10, 0, 0], rotation: [0, 0, 0, 1], velocity: [0, 0, 0] },
          cars: { p1: { position: [10, 0, 0], rotation: [0, 0, 0, 1], velocity: [0, 0, 0] } }
        }
      ]
    };

    const sample = sampleTimeline(velocityTimeline, 0.125);

    expect(sample.ball?.position[0]).toBeCloseTo(1.5625);
    expect(sample.cars.p1.position[0]).toBeCloseTo(1.5625);
    expect(sample.cars.p1.velocity).toEqual([0, 0, 0]);
  });

  it("limits velocity tangents so interpolation does not overshoot short replay gaps", () => {
    const fastVelocityTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        {
          t: 0,
          ball: { position: [0, 0, 0], rotation: [0, 0, 0, 1], velocity: [1000, 0, 0] },
          cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], velocity: [1000, 0, 0] } }
        },
        {
          t: 0.5,
          ball: { position: [10, 0, 0], rotation: [0, 0, 0, 1], velocity: [-1000, 0, 0] },
          cars: { p1: { position: [10, 0, 0], rotation: [0, 0, 0, 1], velocity: [-1000, 0, 0] } }
        }
      ]
    };

    const sample = sampleTimeline(fastVelocityTimeline, 0.25);

    expect(sample.ball?.position[0]).toBeCloseTo(8.75);
    expect(sample.cars.p1.position[0]).toBeCloseTo(8.75);
    expect(sample.ball?.position[0]).toBeLessThanOrEqual(10);
    expect(sample.cars.p1.position[0]).toBeLessThanOrEqual(10);
  });

  it("keeps velocity-aware interpolation behind the shared rigid body sampler", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const mathSource = readFileSync(resolve(process.cwd(), "src/math/interpolation.ts"), "utf8");

    expect(source).toContain("hermiteVec3(a.position, b.position, a.velocity, b.velocity, alpha, spanSeconds)");
    expect(source).toContain("frameWithEstimatedVelocity(track, low - 1, low - 2, low, maxSpeed)");
    expect(source).toContain("interpolate(previousFrame, nextFrame, (t - previous.t) / span, span)");
    expect(mathSource).toContain("export function hermiteVec3");
    expect(mathSource).toContain("function limitedHermiteTangent");
  });

  it("smoothly interpolates boost amount when only boost changes between samples", () => {
    const boostOnlyTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100 } } },
        { t: 1, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 40 } } }
      ]
    };

    expect(sampleTimeline(boostOnlyTimeline, 0.25).cars.p1.boost).toBeCloseTo(85);
    expect(sampleTimeline(boostOnlyTimeline, 0.5).cars.p1.boost).toBeCloseTo(70);
    expect(sampleTimeline(boostOnlyTimeline, 0.75).cars.p1.boost).toBeCloseTo(55);
  });

  it("samples player boost values without interpolating the full replay scene", () => {
    const boostTimeline: ReplayTimeline = {
      ...timeline,
      metadata: {
        ...timeline.metadata,
        players: [
          { id: "p1", name: "Blue", team: 0 },
          { id: "p2", name: "Orange", team: 1 }
        ]
      },
      frames: [
        {
          t: 0,
          cars: {
            p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100 },
            p2: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 40 }
          }
        },
        {
          t: 1,
          cars: {
            p1: { position: [200, 0, 0], rotation: [0, 0, 0, 1], boost: 50 }
          }
        }
      ]
    };
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const boostSamplerSource = source.match(/export function samplePlayerBoostsAt[\s\S]*?\n}\n\nfunction sampleBoostValue/)?.[0] ?? "";

    expect(samplePlayerBoostsAt(boostTimeline, ["p1", "p2"], 0.25)).toEqual({ p1: 87.5, p2: 40 });
    expect(samplePlayerBoostsAt(boostTimeline, ["p1", "p2"], 0.75)).toEqual({ p1: 62.5, p2: 40 });
    expect(samplePlayerBoostsAt(boostTimeline, ["missing"], 0.25)).toEqual({ missing: 0 });
    expect(boostSamplerSource).toContain("findFramePairIndices(timeline.frames, timeSeconds)");
    expect(boostSamplerSource).not.toContain("sampleTimeline(");
    expect(boostSamplerSource).toContain("buildSamplingIndex");
    expect(boostSamplerSource).toContain("isPlayerHiddenByDemo");
    expect(boostSamplerSource).not.toContain("interpolateRigidBody");
  });

  it("removes demolished cars until their respawn frame is available", () => {
    const demoTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 40 } } },
        { t: 1, cars: { p1: { position: [100, 0, 0], rotation: [0, 0, 0, 1], boost: 0, demolished: true } } },
        { t: 3, cars: { p1: { position: [-2048, 2560, 18], rotation: [0, 0, 0, 1], boost: 33, demolished: false } } }
      ]
    };

    expect(sampleTimeline(demoTimeline, 1).cars.p1).toBeUndefined();
    expect(sampleTimeline(demoTimeline, 2).cars.p1).toBeUndefined();
    expect(sampleTimeline(demoTimeline, 3).cars.p1?.position).toEqual([-2048, 2560, 18]);
    expect(sampleTimeline(demoTimeline, 3).cars.p1?.boost).toBe(33);
  });

  it("uses demo events to hide stale victim actors until the detected respawn teleport", () => {
    const demoTimeline: ReplayTimeline = {
      ...timeline,
      events: [{ type: "demo", t: 1, attackerId: "p2", victimId: "p1", label: "Demo" }],
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 50 } } },
        { t: 1, cars: { p1: { position: [100, 0, 0], rotation: [0, 0, 0, 1], boost: 20 } } },
        { t: 4, cars: { p1: { position: [100, 0, 0], rotation: [0, 0, 0, 1], boost: 20 } } },
        { t: 4.1, cars: { p1: { position: [-2048, 2560, 18], rotation: [0, 0, 0, 1], boost: 33 } } }
      ]
    };

    expect(sampleTimeline(demoTimeline, 0.99).cars.p1).toBeDefined();
    expect(sampleTimeline(demoTimeline, 1).cars.p1).toBeUndefined();
    expect(sampleTimeline(demoTimeline, 4).cars.p1).toBeUndefined();
    expect(samplePlayerBoostsAt(demoTimeline, ["p1"], 2)).toEqual({ p1: 0 });
    expect(sampleTimeline(demoTimeline, 4.1).cars.p1?.position).toEqual([-2048, 2560, 18]);
  });

  it("estimates missing endpoint velocities for continuous sparse-sample motion", () => {
    const sparseTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 1, cars: { p1: { position: [10, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 2, cars: { p1: { position: [30, 0, 0], rotation: [0, 0, 0, 1] } } }
      ]
    };

    const before = sampleTimeline(sparseTimeline, 0.99).cars.p1.position[0];
    const at = sampleTimeline(sparseTimeline, 1).cars.p1.position[0];
    const after = sampleTimeline(sparseTimeline, 1.01).cars.p1.position[0];
    const leftVelocity = (at - before) / 0.01;
    const rightVelocity = (after - at) / 0.01;

    expect(leftVelocity).toBeCloseTo(rightVelocity, 0);
    expect(leftVelocity).toBeGreaterThan(10);
    expect(rightVelocity).toBeLessThan(20);
  });

  it("samples boost active as a nearest replicated boolean instead of interpolating it", () => {
    const activeTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boostActive: false } } },
        { t: 1, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boostActive: true } } }
      ]
    };

    expect(sampleTimeline(activeTimeline, 0.49).cars.p1.boostActive).toBe(false);
    expect(sampleTimeline(activeTimeline, 0.51).cars.p1.boostActive).toBe(true);
  });

  it("does not interpolate car motion across reset-sized jumps", () => {
    const resetTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 0.033, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 0.066, cars: { p1: { position: [5000, 0, 0], rotation: [0, 0, 0, 1] } } }
      ]
    };

    expect(sampleTimeline(resetTimeline, 0.033).cars.p1.position).toEqual([0, 0, 0]);
  });

  it("clamps samples to the available timeline range", () => {
    expect(sampleTimeline(timeline, -10).t).toBe(0);
    expect(sampleTimeline(timeline, 10).t).toBe(2);
  });

  it("samples car ids without allocating merged key collections every frame", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const sampleTimelineSource = source.match(/export function sampleTimeline[\s\S]*?\n}\n\nfunction appendSampledCar/)?.[0] ?? "";
    const samplingIndexSource = source.match(/function buildSamplingIndex[\s\S]*?\n}\n\nfunction appendMotionKeyframe/)?.[0] ?? "";

    expect(source).not.toContain("function findFramePair(");
    expect(source).toContain("function appendSampledCar");
    expect(samplingIndexSource).toContain("for (const id in frame.cars)");
    expect(samplingIndexSource).toContain("Object.prototype.hasOwnProperty.call(frame.cars, id)");
    expect(samplingIndexSource).not.toContain("Object.entries(frame.cars)");
    expect(sampleTimelineSource).toContain("for (const id in previous.cars)");
    expect(sampleTimelineSource).toContain("for (const id in next.cars)");
    expect(sampleTimelineSource).toContain("Object.prototype.hasOwnProperty.call(next.cars, id)");
    expect(sampleTimelineSource).toContain("Object.prototype.hasOwnProperty.call(previous.cars, id)");
    expect(sampleTimelineSource).not.toContain("new Set([...Object.keys(previous.cars), ...Object.keys(next.cars)])");
    expect(sampleTimelineSource).not.toContain("Object.keys(previous.cars)");
    expect(sampleTimelineSource).not.toContain("Object.keys(next.cars)");
  });

  it("keeps time-coherent sampling correct when playback seeks forward and backward", () => {
    const movingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        {
          t: 0,
          ball: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
          cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1], boost: 100 } }
        },
        {
          t: 1,
          ball: { position: [100, 0, 0], rotation: [0, 0, 0, 1] },
          cars: { p1: { position: [100, 0, 0], rotation: [0, 0, 0, 1], boost: 80 } }
        },
        {
          t: 2,
          ball: { position: [200, 0, 0], rotation: [0, 0, 0, 1] },
          cars: { p1: { position: [200, 0, 0], rotation: [0, 0, 0, 1], boost: 60 } }
        }
      ],
      camera: [
        { t: 0, playerId: "p1", settings: { fov: 100, height: 80, angle: -4, distance: 240, stiffness: 0.2, swivel: 5 } },
        { t: 1, playerId: "p1", settings: { fov: 110, height: 100, angle: -3, distance: 270, stiffness: 0.35, swivel: 7 } },
        { t: 2, playerId: "p1", settings: { fov: 120, height: 120, angle: -2, distance: 300, stiffness: 0.5, swivel: 9 } }
      ]
    };

    expect(sampleTimeline(movingTimeline, 1.75).cars.p1.position[0]).toBeCloseTo(175);
    expect(sampleTimeline(movingTimeline, 0.25).cars.p1.position[0]).toBeCloseTo(25);
    expect(sampleTimeline(movingTimeline, 1.25).ball?.position[0]).toBeCloseTo(125);
    expect(samplePlayerBoostsAt(movingTimeline, ["p1"], 0.75)).toEqual({ p1: 85 });
    expect(samplePlayerCameraState(movingTimeline, "p1", 1.5)?.settings?.fov).toBeCloseTo(115);
    expect(samplePlayerCameraState(movingTimeline, "p1", 0.5)?.settings?.fov).toBeCloseTo(105);
  });

  it("uses cursor-backed time lookups across replay timeline hot paths", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const framePairSource = source.match(/function findFramePairIndices[\s\S]*?\n}\n\nfunction nearestCarState/)?.[0] ?? "";
    const motionTrackSource = source.match(/function samplePositionTrack[\s\S]*?\n}\n\nfunction sampleRotationTrack/)?.[0] ?? "";
    const cameraSource = source.match(/export function samplePlayerCameraState[\s\S]*?\n}\n\nfunction interpolateCameraSettings/)?.[0] ?? "";
    const distanceSource = source.match(/function carCumulativeDistanceAt[\s\S]*?\n}\n\nfunction carDistanceTrackForCar/)?.[0] ?? "";

    expect(source).toContain("const atOrAfterTimeCursorCache = new WeakMap<ReadonlyArray<{ t: number }>, number>()");
    expect(source).toContain("const afterTimeCursorCache = new WeakMap<ReadonlyArray<{ t: number }>, number>()");
    expect(source).toContain("const TIME_CURSOR_LINEAR_SCAN_LIMIT = 48");
    expect(source).toContain("function firstTimeIndexAtOrAfter");
    expect(source).toContain("function firstTimeIndexAfter");
    expect(source).toContain("function firstTimeIndex");
    expect(source).toContain("function firstTimeIndexBinary");
    expect(framePairSource).toContain("const low = firstTimeIndexAtOrAfter(frames, clamped)");
    expect(motionTrackSource).toContain("const low = firstTimeIndexAtOrAfter(track, t)");
    expect(cameraSource).toContain("const low = firstTimeIndexAfter(track, timeSeconds)");
    expect(distanceSource).toContain("const low = firstTimeIndexAtOrAfter(track, timeSeconds)");
    expect(source).toContain("const cached = cursorCache.get(samples)");
    expect(source).toContain("while (index < samples.length - 1 && isBeforeTarget(samples[index].t, timeSeconds))");
    expect(source).toContain("while (index > 0 && !isBeforeTarget(samples[index - 1].t, timeSeconds))");
    expect(source).toContain("scanned++");
    expect(source).toContain("if (scanned > TIME_CURSOR_LINEAR_SCAN_LIMIT) return firstTimeIndexBinary");
  });

  it("measures car distance over a sampled time window with interpolated boundaries", () => {
    const movingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 1, cars: { p1: { position: [3, 4, 0], rotation: [0, 0, 0, 1] } } },
        { t: 2, cars: { p1: { position: [6, 4, 0], rotation: [0, 0, 0, 1] } } }
      ]
    };

    expect(sampleCarDistanceWindow(movingTimeline, "p1", 2, 2)).toBeCloseTo(8);
    expect(sampleCarDistanceWindow(movingTimeline, "p1", 2, 1.5)).toBeGreaterThan(5);
    expect(sampleCarDistanceWindow(movingTimeline, "p1", 2, 1.5)).toBeLessThan(5.6);
  });

  it("samples car windows without invoking the full replay sampler for each point", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const carWindowSamplesSource = source.match(/function carWindowSamples[\s\S]*?\n}\n\nfunction vec3Distance/)?.[0] ?? "";

    expect(source).toContain("function sampleCarForWindow");
    expect(carWindowSamplesSource).toContain("sampleCarForWindow(timeline, carId, sampleTime)?.position");
    expect(carWindowSamplesSource).toContain("const [, firstInsideIndex] = findFramePairIndices(timeline.frames, startTime)");
    expect(carWindowSamplesSource).toContain("const [lastInsideIndex] = findFramePairIndices(timeline.frames, endTime)");
    expect(carWindowSamplesSource).toContain("for (let index = firstInsideIndex; index <= lastInsideIndex; index++)");
    expect(carWindowSamplesSource).not.toContain("sampleTimeline(timeline, sampleTime)");
    expect(carWindowSamplesSource).not.toContain("timeline.frames.map");
    expect(carWindowSamplesSource).not.toContain("for (const frame of timeline.frames)");
    expect(carWindowSamplesSource).not.toContain(".filter((time)");
    expect(carWindowSamplesSource).not.toContain("samples.slice");
  });

  it("keeps car window distance aligned with sampled car reset and demolition rules", () => {
    const demoTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 0.5, cars: { p1: { position: [5, 0, 0], rotation: [0, 0, 0, 1], demolished: true } } },
        { t: 1, cars: { p1: { position: [10, 0, 0], rotation: [0, 0, 0, 1], demolished: true } } },
        { t: 1.5, cars: { p1: { position: [200, 0, 0], rotation: [0, 0, 0, 1], demolished: false } } }
      ]
    };

    expect(sampleTimeline(demoTimeline, 0.75).cars.p1).toBeUndefined();
    expect(sampleCarDistanceWindow(demoTimeline, "p1", 1.5, 1.5)).toBeCloseTo(0);
  });

  it("places SpawnPerUnit ages at replay-distance crossings inside the window", () => {
    const movingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 1, cars: { p1: { position: [10, 0, 0], rotation: [0, 0, 0, 1] } } }
      ]
    };

    expect(sampleCarSpawnPerUnitAgesWindow(movingTimeline, "p1", 1, 1, 0.5, 1)).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
    expect(sampleCarSpawnPerUnitAgesWindow(movingTimeline, "p1", 1, 0.5, 0.5, 1)).toEqual([0.2, 0.4]);
    expect(sampleCarSpawnPerUnitAgesWindow(movingTimeline, "p1", 1, 0.25, 0.5, 1)).toEqual([0.2]);
  });

  it("samples Alpha Boost flame distance and SpawnPerUnit ages from one car window pass", () => {
    const movingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 1, cars: { p1: { position: [10, 0, 0], rotation: [0, 0, 0, 1] } } }
      ]
    };
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const combinedSource = source.match(/export function sampleCarDistanceAndSpawnPerUnitAgesWindow[\s\S]*?\n}\n\nexport function sampleCarSpawnPerUnitAgesWindow/)?.[0] ?? "";

    expect(sampleCarDistanceAndSpawnPerUnitAgesWindow(movingTimeline, "p1", 1, 1, 0.5, 1)).toEqual({
      distance: 10,
      spawnAges: [0.2, 0.4, 0.6, 0.8, 1]
    });
    expect(combinedSource).toContain("const window = carWindowSamples(timeline, carId, endTimeSeconds, windowSeconds)");
    expect(combinedSource.match(/carWindowSamples/g)).toHaveLength(1);
  });

  it("stops reverse SpawnPerUnit age sampling once ages leave the replay window", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const spawnAgeSource = source.match(/export function sampleCarSpawnPerUnitAgesWindow[\s\S]*?\n}\n\nfunction sampleCarSpawnPerUnitAgesFromEmitterStart/)?.[0] ?? "";

    expect(spawnAgeSource).toContain("if (age > windowSeconds) return ages");
    expect(spawnAgeSource).toContain("carWindowSamples(timeline, carId, endTimeSeconds, windowSeconds, false)");
    expect(source).toContain("measureDistance = true");
    expect(source).toContain("if (measureDistance && previous && current) distance += vec3Distance(previous, current)");
    expect(spawnAgeSource).not.toContain("ages.filter((age) => age <= windowSeconds)");
  });

  it("carries SpawnPerUnit distance phase forward from a known emitter start", () => {
    const movingTimeline: ReplayTimeline = {
      ...timeline,
      frames: [
        { t: 0, cars: { p1: { position: [0, 0, 0], rotation: [0, 0, 0, 1] } } },
        { t: 2, cars: { p1: { position: [22, 0, 0], rotation: [0, 0, 0, 1] } } }
      ]
    };

    expect(sampleCarSpawnPerUnitAgesWindow(movingTimeline, "p1", 2, 1, 0.2, 1, 0)).toEqual([0.181818, 0.636364]);
  });

  it("caches cumulative car distance so long boost segments do not rescan from emitter start every frame", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const spawnAgeSource = source.match(/function sampleCarSpawnPerUnitAgesFromEmitterStart[\s\S]*?\n}\n\nfunction carCumulativeDistanceAt/)?.[0] ?? "";

    expect(source).toContain("carDistanceTrackCache");
    expect(source).toContain("function carCumulativeDistanceAt");
    expect(source).toContain("function carDistanceTrackForCar");
    expect(spawnAgeSource).toContain("const distanceAtEmitterStart = carCumulativeDistanceAt(timeline, carId, emitterStartTime)");
    expect(spawnAgeSource).toContain("const distanceAtWindowStart = carCumulativeDistanceAt(timeline, carId, windowStartTime)");
    expect(spawnAgeSource).toContain("carWindowSamples(timeline, carId, endTime, endTime - windowStartTime)");
    expect(spawnAgeSource).not.toContain("carWindowSamples(timeline, carId, endTime, endTime - emitterStartTime)");
  });
});
