import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  cameraModeOptions,
  cameraRigForMode,
  cameraSmoothingAlpha,
  directorTargetPlayerId,
  freeCameraKeyboardDisplacement,
  freeCameraMoveIntentForCode
} from "../viewer/SpectatorCamera";

describe("cameraRigForMode", () => {
  it("offers one combined player camera mode instead of separate player ball/car modes", () => {
    expect(cameraModeOptions.map((option) => option.value)).toContain("player");
    expect(cameraModeOptions.map((option) => option.label)).not.toContain("Player ball cam");
    expect(cameraModeOptions.map((option) => option.label)).not.toContain("Player car cam");
  });

  it("places player car cam behind the selected car heading when ball cam is off", () => {
    const rig = cameraRigForMode(
      "player",
      {
        t: 0,
        ball: { position: [0, 100, 0], rotation: [0, 0, 0, 1] },
        cars: {
          p1: { position: [1000, 50, 2000], rotation: [0, 0, 0, 1] }
        }
      },
      "p1",
      [],
      { usingSecondaryCamera: false, settings: { fov: 110, height: 100, angle: -3, distance: 270, stiffness: 0.35, swivel: 7 } }
    );

    expect(rig.position).toEqual([730, 150, 2000]);
    expect(rig.target).toEqual([1080, 140, 2000]);
    expect(rig.up).toEqual([0, 1, 0]);
    expect(rig.fov).toBe(110);
  });

  it("treats replay camera settings without a secondary-camera flag as car cam until a toggle arrives", () => {
    const rig = cameraRigForMode(
      "player",
      {
        t: 0,
        ball: { position: [1000, 220, 1200], rotation: [0, 0, 0, 1] },
        cars: {
          p1: { position: [1000, 50, 2000], rotation: [0, 0, 0, 1] }
        }
      },
      "p1",
      [],
      { playerId: "p1", t: 0, settings: { fov: 110, height: 100, angle: -3, distance: 270, stiffness: 0.35, swivel: 7 } }
    );

    expect(rig.target).toEqual([1080, 140, 2000]);
    expect(rig.ballCam).toBe(false);
  });

  it("orbits the player camera around the car toward the ball when ball cam is on", () => {
    const rig = cameraRigForMode(
      "player",
      {
        t: 0,
        ball: { position: [1000, 220, 1200], rotation: [0, 0, 0, 1] },
        cars: {
          p1: { position: [1000, 50, 2000], rotation: [0, 0, 0, 1] }
        }
      },
      "p1",
      [],
      { usingSecondaryCamera: true, settings: { fov: 110, height: 100, angle: -3, distance: 270, stiffness: 0.35, swivel: 7 } }
    );

    expect(rig.position[0]).toBeCloseTo(1000);
    expect(rig.position[1]).toBeCloseTo(150);
    expect(rig.position[2]).toBeCloseTo(2270);
    expect(rig.target).toEqual([1000, 220, 1200]);
  });

  it("chooses the car nearest the ball for director focus", () => {
    const target = directorTargetPlayerId({
      t: 12,
      ball: { position: [1000, 120, 1000], rotation: [0, 0, 0, 1] },
      cars: {
        far: { position: [-3000, 20, -3000], rotation: [0, 0, 0, 1] },
        close: { position: [1100, 20, 1120], rotation: [0, 0, 0, 1] }
      }
    });

    expect(target).toBe("close");
  });

  it("uses nearby replay events for director focus when available", () => {
    const target = directorTargetPlayerId(
      {
        t: 31,
        ball: { position: [1000, 120, 1000], rotation: [0, 0, 0, 1] },
        cars: {
          scorer: { position: [-3000, 20, -3000], rotation: [0, 0, 0, 1] },
          close: { position: [1100, 20, 1120], rotation: [0, 0, 0, 1] }
        }
      },
      [{ type: "goal", t: 30.5, scorerId: "scorer", team: 0 }]
    );

    expect(target).toBe("scorer");
  });

  it("uses cached sorted director events without requiring replay event order", () => {
    const target = directorTargetPlayerId(
      {
        t: 31,
        ball: { position: [1000, 120, 1000], rotation: [0, 0, 0, 1] },
        cars: {
          early: { position: [-3000, 20, -3000], rotation: [0, 0, 0, 1] },
          scorer: { position: [-2500, 20, -2500], rotation: [0, 0, 0, 1] },
          close: { position: [1100, 20, 1120], rotation: [0, 0, 0, 1] }
        }
      },
      [
        { type: "goal", t: 80, scorerId: "early", team: 0 },
        { type: "goal", t: 30.5, scorerId: "scorer", team: 0 },
        { type: "save", t: 10, playerId: "early" }
      ]
    );
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");

    expect(target).toBe("scorer");
    expect(cameraSource).toContain("directorEventCache");
    expect(cameraSource).toContain("firstDirectorEventIndexAtOrAfter");
    expect(cameraSource).toContain("timeSeconds - DIRECTOR_EVENT_LOOKBACK_SECONDS");
    expect(cameraSource).toContain("if (candidate.event.t >= upperTime) break");
  });

  it("avoids per-frame director event sorting and duplicate target resolution", () => {
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(cameraSource).toContain("function nearestDirectorEvent");
    expect(cameraSource).toContain("directorEventsFor(events)");
    expect(cameraSource).not.toContain(".filter((candidate) => Math.abs(candidate.t - sample.t) < 3.5)");
    expect(cameraSource).not.toContain(".sort((a, b) => Math.abs(a.t - sample.t) - Math.abs(b.t - sample.t))");
    expect(sceneRootSource).toContain('const cameraRigMode = state.cameraMode === "director" ? "player" : state.cameraMode');
    expect(sceneRootSource).toContain("cameraRigMode,\n      sample,\n      cameraPlayerId,");
  });

  it("reuses scratch vectors on the player camera hot path", () => {
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");

    expect(cameraSource).toContain("const TMP_CAR_POSITION = new Vector3()");
    expect(cameraSource).toContain("const TMP_CAMERA_POSITION = new Vector3()");
    expect(cameraSource).toContain("const TMP_NEAREST_CAR_POSITION = new Vector3()");
    expect(cameraSource).toContain("TMP_CAR_POSITION.fromArray(selectedCar.position)");
    expect(cameraSource).toContain("TMP_NEAREST_CAR_POSITION.fromArray(car.position).distanceToSquared(ball)");
    expect(cameraSource).not.toContain("const carPosition = new Vector3().fromArray(selectedCar.position)");
    expect(cameraSource).not.toContain("new Vector3().fromArray(car.position).distanceToSquared(ball)");
  });

  it("uses top-down camera up vector that keeps the field oriented", () => {
    const rig = cameraRigForMode("top-down", { t: 0, cars: {} });
    expect(rig.position).toEqual([0, 9300, 0]);
    expect(rig.target).toEqual([0, 0, 0]);
    expect(rig.up).toEqual([0, 0, -1]);
  });

  it("uses elapsed-time camera smoothing instead of frame-count smoothing", () => {
    const fullFrame = cameraSmoothingAlpha(1 / 30, 8);
    const halfFrame = cameraSmoothingAlpha(1 / 60, 8);
    const twoHalfFrames = 1 - (1 - halfFrame) * (1 - halfFrame);

    expect(twoHalfFrames).toBeCloseTo(fullFrame);
  });

  it("maps WASD/EQ keys to free camera movement intents", () => {
    expect(freeCameraMoveIntentForCode("KeyW")).toBe("forward");
    expect(freeCameraMoveIntentForCode("KeyA")).toBe("left");
    expect(freeCameraMoveIntentForCode("KeyS")).toBe("backward");
    expect(freeCameraMoveIntentForCode("KeyD")).toBe("right");
    expect(freeCameraMoveIntentForCode("KeyE")).toBe("up");
    expect(freeCameraMoveIntentForCode("KeyQ")).toBe("down");
    expect(freeCameraMoveIntentForCode("Space")).toBeUndefined();
  });

  it("moves free camera from WASD/EQ input relative to the current view", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 0);
    camera.lookAt(new Vector3(1, 0, 0));
    camera.updateMatrixWorld();

    const forward = freeCameraKeyboardDisplacement(camera, new Set(["forward"]), 0.5, 200);
    expect(forward.x).toBeCloseTo(100);
    expect(forward.y).toBeCloseTo(0);
    expect(forward.z).toBeCloseTo(0);

    const right = freeCameraKeyboardDisplacement(camera, new Set(["right"]), 0.5, 200);
    expect(right.x).toBeCloseTo(0);
    expect(right.y).toBeCloseTo(0);
    expect(right.z).toBeCloseTo(100);

    const down = freeCameraKeyboardDisplacement(camera, new Set(["down"]), 0.5, 200);
    expect(down.x).toBeCloseTo(0);
    expect(down.y).toBeCloseTo(-100);
    expect(down.z).toBeCloseTo(0);
  });

  it("starts free camera at its closest orbit distance for first-person-style control", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("const FREE_CAMERA_INITIAL_POSITION: [number, number, number] = [0, 160, 0]");
    expect(sceneRootSource).toContain("const FREE_CAMERA_TARGET: [number, number, number] = [0, 160, -1]");
    expect(sceneRootSource).toContain("const FREE_CAMERA_MIN_DISTANCE = 1");
    expect(sceneRootSource).toContain("minDistance={FREE_CAMERA_MIN_DISTANCE}");
    expect(sceneRootSource).toContain("target={FREE_CAMERA_TARGET}");
  });
});
