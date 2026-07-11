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
  freeCameraMoveIntentForCode,
  setCameraLookAt
} from "../viewer/SpectatorCamera";

describe("cameraRigForMode", () => {
  it("offers one combined player camera mode instead of separate player ball/car modes", () => {
    expect(cameraModeOptions.map((option) => option.value)).toContain("player");
    expect(cameraModeOptions.map((option) => option.label)).not.toContain("Player ball cam");
    expect(cameraModeOptions.map((option) => option.label)).not.toContain("Player car cam");
  });

  it("subscribes scene root only to render-facing viewer state", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain('import { useShallow } from "zustand/shallow"');
    expect(sceneRootSource).toContain("useViewerStore(\n    useShallow((state) => ({");
    expect(sceneRootSource).toContain("coordinateOptions: state.coordinateOptions");
    expect(sceneRootSource).toContain("selectedPlayerId: state.selectedPlayerId");
    expect(sceneRootSource).toContain("cameraMode: state.cameraMode");
    expect(sceneRootSource).not.toContain("const coordinateOptions = useViewerStore((state) => state.coordinateOptions)");
    expect(sceneRootSource).not.toContain("const selectedPlayerId = useViewerStore((state) => state.selectedPlayerId)");
    expect(sceneRootSource).not.toContain("const cameraMode = useViewerStore((state) => state.cameraMode)");
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
    expect(rig.target[0]).toBeCloseTo(1080);
    expect(rig.target[1]).toBeCloseTo(135.85, 1);
    expect(rig.target[2]).toBeCloseTo(2000);
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

    expect(rig.target[0]).toBeCloseTo(1080);
    expect(rig.target[1]).toBeCloseTo(135.85, 1);
    expect(rig.target[2]).toBeCloseTo(2000);
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

  it("keeps the ball camera safely above and behind ball travel", () => {
    const rig = cameraRigForMode("ball", {
      t: 0,
      ball: { position: [0, 100, 0], rotation: [0, 0, 0, 1], velocity: [1200, 200, 0] },
      cars: {}
    });

    expect(rig.position[0]).toBeLessThan(-1000);
    expect(rig.position[1]).toBeGreaterThan(700);
    expect(Math.hypot(rig.position[0], rig.position[1] - 100, rig.position[2])).toBeGreaterThan(1400);
    expect(rig.target[0]).toBeGreaterThan(0);
    expect(rig.fov).toBe(72);
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

  it("caches only player-focused director events with their resolved focus player", () => {
    const target = directorTargetPlayerId(
      {
        t: 31,
        ball: { position: [1000, 120, 1000], rotation: [0, 0, 0, 1] },
        cars: {
          scorer: { position: [-2500, 20, -2500], rotation: [0, 0, 0, 1] },
          close: { position: [1100, 20, 1120], rotation: [0, 0, 0, 1] }
        }
      },
      [
        { type: "goal", t: 30.9, team: 0 },
        { type: "goal", t: 30.5, scorerId: "scorer", team: 0 }
      ]
    );
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");

    expect(target).toBe("scorer");
    expect(cameraSource).toContain("focusPlayerId: string");
    expect(cameraSource).toContain("const focusPlayerId = eventPlayerIdForCamera(event)");
    expect(cameraSource).toContain("if (focusPlayerId) sortedEvents.push({ event, focusPlayerId, index })");
    expect(cameraSource).toContain("nearestDirectorEventPlayerId");
    expect(cameraSource).not.toContain("events.map((event, index) => ({ event, index }))");
  });

  it("avoids per-frame director event sorting and duplicate target resolution", () => {
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(cameraSource).toContain("function nearestDirectorEventPlayerId");
    expect(cameraSource).toContain("directorEventsFor(events)");
    expect(cameraSource).not.toContain(".filter((candidate) => Math.abs(candidate.t - sample.t) < 3.5)");
    expect(cameraSource).not.toContain(".sort((a, b) => Math.abs(a.t - sample.t) - Math.abs(b.t - sample.t))");
    expect(sceneRootSource).toContain("state.cameraMode,\n      sample,\n      cameraPlayerId,");
    expect(sceneRootSource).not.toContain("cameraRigMode");
  });

  it("reuses scratch vectors on the player camera hot path", () => {
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");
    const directorTargetSource = cameraSource.match(/export function directorTargetPlayerId[\s\S]*?\n}\n\nfunction nearestDirectorEvent/)?.[0] ?? "";

    expect(cameraSource).toContain("const TMP_CAR_POSITION = new Vector3()");
    expect(cameraSource).toContain("const TMP_CAMERA_POSITION = new Vector3()");
    expect(cameraSource).toContain("const TMP_NEAREST_CAR_POSITION = new Vector3()");
    expect(cameraSource).toContain("TMP_CAR_POSITION.fromArray(selectedCar.position)");
    expect(cameraSource).toContain("TMP_NEAREST_CAR_POSITION.fromArray(car.position).distanceToSquared(ball)");
    expect(cameraSource).toContain("function firstSampledCarId");
    expect(directorTargetSource).toContain("for (const id in sample.cars)");
    expect(directorTargetSource).toContain("Object.prototype.hasOwnProperty.call(sample.cars, id)");
    expect(cameraSource).toContain("const settings = playerCameraState?.settings ?? DEFAULT_CAMERA_SETTINGS");
    expect(cameraSource).not.toContain("const carPosition = new Vector3().fromArray(selectedCar.position)");
    expect(cameraSource).not.toContain("new Vector3().fromArray(car.position).distanceToSquared(ball)");
    expect(cameraSource).not.toContain("{ ...DEFAULT_CAMERA_SETTINGS, ...playerCameraState?.settings }");
    expect(directorTargetSource).not.toContain("Object.entries(sample.cars)");
    expect(directorTargetSource).not.toContain("Object.keys(sample.cars)");
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
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");

    expect(twoHalfFrames).toBeCloseTo(fullFrame);
    expect(cameraSource).toContain("camera.position.lerp(cameraPosition, cameraSmoothingAlpha(deltaSeconds, 30))");
    expect(cameraSource).not.toContain("camera.position.lerp(cameraPosition, 0.12)");
  });

  it("applies helper camera smoothing consistently across frame rates", () => {
    const targetPosition = new Vector3(1000, 0, 0);
    const target = new Vector3();
    const fullFrameCamera = {
      position: new Vector3(),
      lookAt: () => undefined
    };
    const halfFrameCamera = {
      position: new Vector3(),
      lookAt: () => undefined
    };

    setCameraLookAt(targetPosition, target, fullFrameCamera, 1 / 30);
    setCameraLookAt(targetPosition, target, halfFrameCamera, 1 / 60);
    setCameraLookAt(targetPosition, target, halfFrameCamera, 1 / 60);

    expect(halfFrameCamera.position.x).toBeCloseTo(fullFrameCamera.position.x);
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

  it("reuses free camera movement scratch vectors on the frame path", () => {
    const camera = new PerspectiveCamera();
    const movement = new Vector3();
    const forward = new Vector3();
    const right = new Vector3();
    camera.position.set(0, 0, 0);
    camera.lookAt(new Vector3(1, 0, 0));
    camera.updateMatrixWorld();

    const displacement = freeCameraKeyboardDisplacement(camera, new Set(["forward"]), 0.5, 200, movement, forward, right);
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    const cameraSource = readFileSync(resolve(process.cwd(), "src/viewer/SpectatorCamera.ts"), "utf8");

    expect(displacement).toBe(movement);
    expect(displacement.x).toBeCloseTo(100);
    expect(sceneRootSource).toContain("freeCameraKeyboardDisplacement(camera, activeIntents.current, delta, undefined, movement, forward, right)");
    expect(cameraSource).toContain("target = new Vector3()");
    expect(cameraSource).toContain("right.copy(forward).cross(WORLD_UP)");
    expect(cameraSource).not.toContain("const movement = new Vector3()");
    expect(cameraSource).not.toContain("new Vector3().copy(forward).cross(WORLD_UP)");
  });

  it("implements free camera as in-place first-person look instead of an orbit", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("const SAFE_INITIAL_CAMERA_POSITION: [number, number, number] = [0, 620, 1400]");
    expect(sceneRootSource).toContain("function FirstPersonFreeCameraControls");
    expect(sceneRootSource).toContain('new THREE.Euler(0, 0, 0, "YXZ")');
    expect(sceneRootSource).toContain('canvas.addEventListener("pointerdown", handlePointerDown)');
    expect(sceneRootSource).toContain("camera.quaternion.setFromEuler(yawPitch)");
    expect(sceneRootSource).not.toContain("OrbitControls");
  });

  it("attaches replay cameras directly to interpolated state while easing director cuts", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain('state.cameraMode !== "director"');
    expect(sceneRootSource).toContain("camera.position.copy(tmpDesired)");
    expect(sceneRootSource).toContain("smoothedTarget.current.copy(tmpTarget)");
    expect(sceneRootSource).toContain("camera.position.lerp(tmpDesired, cameraSmoothingAlpha(delta, 10.5))");
    expect(sceneRootSource).toContain("externalSeek || cameraChanged");
  });
});
