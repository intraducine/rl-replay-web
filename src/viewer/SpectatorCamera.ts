import { Camera, Quaternion, Vector3 } from "three";
import type { ReplayEvent, ReplayTimeline, SampledReplayState } from "../replay/types";

export type CameraMode = "free" | "ball" | "player-follow" | "player-chase" | "top-down" | "director";
export type FreeCameraMoveIntent = "forward" | "backward" | "left" | "right" | "up" | "down";

export const cameraModeOptions: Array<{ value: CameraMode; label: string }> = [
  { value: "free", label: "Free" },
  { value: "ball", label: "Ball view" },
  { value: "player-follow", label: "Player ball cam" },
  { value: "player-chase", label: "Player car cam" },
  { value: "top-down", label: "Top down" },
  { value: "director", label: "Director" }
];

export function pickDirectorMode(timeline: ReplayTimeline, sample: SampledReplayState, selectedPlayerId?: string): CameraMode {
  return (directorTargetPlayerId(sample, timeline.events) ?? selectedPlayerId) ? "player-follow" : "ball";
}

export type CameraRig = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
};

const PLAYER_CAMERA_DISTANCE = 860;
const PLAYER_CAMERA_HEIGHT = 430;
const PLAYER_CAMERA_LOOK_AHEAD = 80;
const PLAYER_CAMERA_TARGET_HEIGHT = 90;
export const FREE_CAMERA_KEYBOARD_MOVE_SPEED = 3200;
const WORLD_UP = new Vector3(0, 1, 0);

export function cameraRigForMode(
  mode: CameraMode,
  sample: SampledReplayState,
  selectedPlayerId?: string,
  events: ReplayEvent[] = []
): CameraRig {
  const ball = sample.ball?.position ?? [0, 120, 0];
  const directorPlayerId = mode === "director" ? directorTargetPlayerId(sample, events) ?? selectedPlayerId : undefined;
  const targetPlayerId = directorPlayerId ?? selectedPlayerId;
  const selectedCar = targetPlayerId ? sample.cars[targetPlayerId] : undefined;
  const selectedPosition = selectedCar?.position ?? ball;

  if (mode === "top-down") {
    return {
      position: [0, 9300, 0],
      target: [0, 0, 0],
      up: [0, 0, -1]
    };
  }

  if (mode === "player-chase" && selectedCar) {
    const carPosition = new Vector3().fromArray(selectedCar.position);
    const forward = forwardVectorFromCar(selectedCar.rotation);
    const cameraPosition = carPosition.clone().addScaledVector(forward, -PLAYER_CAMERA_DISTANCE).add(new Vector3(0, PLAYER_CAMERA_HEIGHT, 0));
    const target = carPosition.clone().addScaledVector(forward, PLAYER_CAMERA_LOOK_AHEAD).add(new Vector3(0, PLAYER_CAMERA_TARGET_HEIGHT, 0));

    return {
      position: vectorToTuple(cameraPosition),
      target: vectorToTuple(target),
      up: [0, 1, 0]
    };
  }

  if ((mode === "player-follow" || mode === "director") && selectedCar) {
    const carPosition = new Vector3().fromArray(selectedCar.position);
    const forward = forwardVectorFromCar(selectedCar.rotation);
    const target = sample.ball ? new Vector3().fromArray(ball) : carPosition.clone().addScaledVector(forward, PLAYER_CAMERA_LOOK_AHEAD);
    const position = carPosition.clone().addScaledVector(forward, -PLAYER_CAMERA_DISTANCE).add(new Vector3(0, PLAYER_CAMERA_HEIGHT, 0));

    return {
      position: vectorToTuple(position),
      target: vectorToTuple(target),
      up: [0, 1, 0]
    };
  }

  if (mode === "ball" || !selectedCar) {
    return {
      position: [ball[0] + 1500, ball[1] + 1200, ball[2] + 1900],
      target: ball,
      up: [0, 1, 0]
    };
  }

  return {
    position: [selectedPosition[0] + 900, selectedPosition[1] + 1350, selectedPosition[2] + 900],
    target: selectedPosition,
    up: [0, 1, 0]
  };
}

export function directorTargetPlayerId(sample: SampledReplayState, events: ReplayEvent[] = []): string | undefined {
  const event = events
    .filter((candidate) => Math.abs(candidate.t - sample.t) < 3.5)
    .sort((a, b) => Math.abs(a.t - sample.t) - Math.abs(b.t - sample.t))[0];
  const eventPlayerId = eventPlayerIdForCamera(event);
  if (eventPlayerId && sample.cars[eventPlayerId]) return eventPlayerId;

  if (!sample.ball) return Object.keys(sample.cars)[0];
  const ball = new Vector3().fromArray(sample.ball.position);
  let bestId: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [id, car] of Object.entries(sample.cars)) {
    const distance = new Vector3().fromArray(car.position).distanceToSquared(ball);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = id;
    }
  }

  return bestId;
}

function eventPlayerIdForCamera(event?: ReplayEvent): string | undefined {
  if (!event) return undefined;
  if (event.type === "goal") return event.scorerId;
  if (event.type === "shot" || event.type === "save") return event.playerId;
  if (event.type === "demo") return event.attackerId ?? event.victimId;
  return undefined;
}

function forwardVectorFromCar(rotation: [number, number, number, number]) {
  const quaternion = new Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]);
  const forward = new Vector3(1, 0, 0).applyQuaternion(quaternion);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) return new Vector3(1, 0, 0);
  return forward.normalize();
}

function vectorToTuple(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function setCameraLookAt(cameraPosition: Vector3, target: Vector3, camera: { position: Vector3; lookAt: (v: Vector3) => void }) {
  camera.position.lerp(cameraPosition, 0.12);
  camera.lookAt(target);
}

export function cameraSmoothingAlpha(deltaSeconds: number, responseRate: number): number {
  return 1 - Math.exp(-Math.max(0, deltaSeconds) * responseRate);
}

export function freeCameraMoveIntentForCode(code: string): FreeCameraMoveIntent | undefined {
  switch (code) {
    case "KeyW":
      return "forward";
    case "KeyS":
      return "backward";
    case "KeyA":
      return "left";
    case "KeyD":
      return "right";
    case "KeyE":
      return "up";
    case "KeyQ":
      return "down";
    default:
      return undefined;
  }
}

export function freeCameraKeyboardDisplacement(
  camera: Camera,
  activeIntents: ReadonlySet<FreeCameraMoveIntent>,
  deltaSeconds: number,
  speed = FREE_CAMERA_KEYBOARD_MOVE_SPEED
): Vector3 {
  const forward = new Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) {
    forward.set(0, 0, -1);
  } else {
    forward.normalize();
  }

  const right = new Vector3().copy(forward).cross(WORLD_UP);
  if (right.lengthSq() < 0.0001) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }

  const movement = new Vector3();
  if (activeIntents.has("forward")) movement.add(forward);
  if (activeIntents.has("backward")) movement.sub(forward);
  if (activeIntents.has("right")) movement.add(right);
  if (activeIntents.has("left")) movement.sub(right);
  if (activeIntents.has("up")) movement.add(WORLD_UP);
  if (activeIntents.has("down")) movement.sub(WORLD_UP);

  if (movement.lengthSq() > 1) movement.normalize();
  return movement.multiplyScalar(Math.max(0, deltaSeconds) * speed);
}
