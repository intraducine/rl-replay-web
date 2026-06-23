import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sampleCarDistanceWindow, sampleCarSpawnPerUnitAgesWindow, samplePlayerCameraState, sampleTimeline } from "../replay/ReplayTimeline";
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

  it("keeps velocity-aware interpolation behind the shared rigid body sampler", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const mathSource = readFileSync(resolve(process.cwd(), "src/math/interpolation.ts"), "utf8");

    expect(source).toContain("hermiteVec3(a.position, b.position, a.velocity, b.velocity, alpha, spanSeconds)");
    expect(source).toContain("interpolate(previous.frame, next.frame, (t - previous.t) / span, span)");
    expect(mathSource).toContain("export function hermiteVec3");
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
    expect(sampleCarDistanceWindow(movingTimeline, "p1", 2, 1.5)).toBeCloseTo(5.5);
  });

  it("samples car windows without invoking the full replay sampler for each point", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const carWindowSamplesSource = source.match(/function carWindowSamples[\s\S]*?\n}\n\nfunction vec3Distance/)?.[0] ?? "";

    expect(source).toContain("function sampleCarForWindow");
    expect(carWindowSamplesSource).toContain("sampleCarForWindow(timeline, carId, sampleTime)?.position");
    expect(carWindowSamplesSource).not.toContain("sampleTimeline(timeline, sampleTime)");
    expect(carWindowSamplesSource).not.toContain("timeline.frames.map");
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

  it("stops reverse SpawnPerUnit age sampling once ages leave the replay window", () => {
    const source = readFileSync(resolve(process.cwd(), "src/replay/ReplayTimeline.ts"), "utf8");
    const spawnAgeSource = source.match(/export function sampleCarSpawnPerUnitAgesWindow[\s\S]*?\n}\n\nfunction sampleCarSpawnPerUnitAgesFromEmitterStart/)?.[0] ?? "";

    expect(spawnAgeSource).toContain("if (age > windowSeconds) return ages");
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
});
