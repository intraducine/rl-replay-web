import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  cameraRigForMode,
  cameraSmoothingAlpha,
  directorTargetPlayerId,
  freeCameraKeyboardDisplacement,
  freeCameraMoveIntentForCode
} from "../viewer/SpectatorCamera";

describe("cameraRigForMode", () => {
  it("places chase camera behind the selected car heading", () => {
    const rig = cameraRigForMode(
      "player-chase",
      {
        t: 0,
        ball: { position: [0, 100, 0], rotation: [0, 0, 0, 1] },
        cars: {
          p1: { position: [1000, 50, 2000], rotation: [0, 0, 0, 1] }
        }
      },
      "p1"
    );

    expect(rig.position).toEqual([140, 480, 2000]);
    expect(rig.target).toEqual([1080, 140, 2000]);
    expect(rig.up).toEqual([0, 1, 0]);
  });

  it("uses a player ball-cam style rig for player follow", () => {
    const rig = cameraRigForMode(
      "player-follow",
      {
        t: 0,
        ball: { position: [1000, 220, 1200], rotation: [0, 0, 0, 1] },
        cars: {
          p1: { position: [1000, 50, 2000], rotation: [0, 0, 0, 1] }
        }
      },
      "p1"
    );

    expect(rig.position[0]).toBeCloseTo(140);
    expect(rig.position[1]).toBeCloseTo(480);
    expect(rig.position[2]).toBeCloseTo(2000);
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
});
