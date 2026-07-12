import { Camera, MathUtils, Quaternion, Vector3 } from "three";
import type { ReplayCameraSample, ReplayEvent, ReplayTimeline, SampledReplayState } from "../replay/types";

export type CameraMode = "free" | "ball" | "player" | "top-down" | "director";
export type FreeCameraMoveIntent = "forward" | "backward" | "left" | "right" | "up" | "down";

export const cameraModeOptions: Array<{ value: CameraMode; label: string }> = [
  { value: "free", label: "Free" },
  { value: "ball", label: "Ball view" },
  { value: "player", label: "Player cam" },
  { value: "top-down", label: "Top down" },
  { value: "director", label: "Director" }
];

export function pickDirectorMode(timeline: ReplayTimeline, sample: SampledReplayState, selectedPlayerId?: string): CameraMode {
  return (directorTargetPlayerId(sample, timeline.events) ?? selectedPlayerId) ? "player" : "ball";
}

export type CameraRig = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov?: number;
  ballCam?: boolean;
};

const DEFAULT_CAMERA_SETTINGS = {
  fov: 110,
  height: 100,
  angle: -3,
  distance: 270,
  stiffness: 0.35,
  swivel: 7,
  transition: 1.5
};
const PLAYER_CAMERA_LOOK_AHEAD = 80;
const BALL_CAMERA_DISTANCE = 1320;
const BALL_CAMERA_HEIGHT = 720;
const BALL_CAMERA_LOOK_AHEAD_SECONDS = 0.08;
const BALL_CAMERA_MIN_TRAVEL_SPEED_SQ = 10_000;
const DIRECTOR_ESTABLISHING_RIG: CameraRig = {
  position: [0, 660, 4700],
  target: [0, 610, -5150],
  up: [0, 1, 0],
  fov: 52
};
export const FREE_CAMERA_KEYBOARD_MOVE_SPEED = 3200;
const WORLD_UP = new Vector3(0, 1, 0);
const FALLBACK_BALL = new Vector3(0, 120, 0);
const TMP_FORWARD = new Vector3();
const TMP_BALL_DIRECTION = new Vector3();
const TMP_CAR_POSITION = new Vector3();
const TMP_BALL_POSITION = new Vector3();
const TMP_CAMERA_DIRECTION = new Vector3();
const TMP_CAMERA_POSITION = new Vector3();
const TMP_CAMERA_TARGET = new Vector3();
const TMP_BALL_TRAVEL = new Vector3();
const TMP_NEAREST_BALL_POSITION = new Vector3();
const TMP_NEAREST_CAR_POSITION = new Vector3();
const PLAYER_CAMERA_HEIGHT_OFFSET = new Vector3(0, DEFAULT_CAMERA_SETTINGS.height, 0);
const PLAYER_CAMERA_TARGET_HEIGHT_OFFSET = new Vector3();
const DIRECTOR_EVENT_LOOKBACK_SECONDS = 3.5;

type DirectorEventEntry = { event: ReplayEvent; focusPlayerId: string; index: number };

const directorEventCache = new WeakMap<ReplayEvent[], DirectorEventEntry[]>();

export function cameraRigForMode(
  mode: CameraMode,
  sample: SampledReplayState,
  selectedPlayerId?: string,
  events: ReplayEvent[] = [],
  playerCameraState?: ReplayCameraSample
): CameraRig {
  const ball = sample.ball?.position ?? [0, 120, 0];
  if (mode === "director") return DIRECTOR_ESTABLISHING_RIG;

  const selectedCar = selectedPlayerId ? sample.cars[selectedPlayerId] : undefined;
  const selectedPosition = selectedCar?.position ?? ball;

  if (mode === "top-down") {
    return {
      position: [0, 9300, 0],
      target: [0, 0, 0],
      up: [0, 0, -1],
      fov: 58
    };
  }

  if (mode === "player" && selectedCar) {
    const carPosition = TMP_CAR_POSITION.fromArray(selectedCar.position);
    const forward = forwardVectorFromCar(selectedCar.rotation);
    const settings = playerCameraState?.settings ?? DEFAULT_CAMERA_SETTINGS;
    const usingBehindView = playerCameraState?.usingBehindView === true;
    const usingBallCam = !usingBehindView && playerCameraState?.usingSecondaryCamera === true && !!sample.ball;
    const ballPosition = sample.ball ? TMP_BALL_POSITION.fromArray(ball) : FALLBACK_BALL;
    const lookDirection = playerCameraLookDirection(usingBallCam, carPosition, forward, ballPosition);
    const cameraDirection = usingBehindView ? TMP_CAMERA_DIRECTION.copy(forward).negate() : TMP_CAMERA_DIRECTION.copy(lookDirection);
    const cameraPosition = TMP_CAMERA_POSITION
      .copy(carPosition)
      .addScaledVector(cameraDirection, -settings.distance)
      .add(PLAYER_CAMERA_HEIGHT_OFFSET.setY(settings.height));
    const target = usingBallCam
      ? TMP_CAMERA_TARGET.copy(ballPosition)
      : TMP_CAMERA_TARGET
          .copy(carPosition)
          .addScaledVector(usingBehindView ? TMP_CAMERA_DIRECTION.copy(forward).negate() : forward, PLAYER_CAMERA_LOOK_AHEAD)
          .add(
            PLAYER_CAMERA_TARGET_HEIGHT_OFFSET.set(
              0,
              settings.height + Math.tan(MathUtils.degToRad(settings.angle)) * settings.distance,
              0
            )
          );

    return {
      position: vectorToTuple(cameraPosition),
      target: vectorToTuple(target),
      up: [0, 1, 0],
      fov: settings.fov,
      ballCam: usingBallCam
    };
  }

  if (mode === "ball" || !selectedCar) {
    return ballCameraRig(sample, selectedCar);
  }

  return {
    position: [selectedPosition[0] + 900, selectedPosition[1] + 1350, selectedPosition[2] + 900],
    target: selectedPosition,
    up: [0, 1, 0]
  };
}

function ballCameraRig(sample: SampledReplayState, selectedCar?: SampledReplayState["cars"][string]): CameraRig {
  const ballPosition = sample.ball ? TMP_BALL_POSITION.fromArray(sample.ball.position) : FALLBACK_BALL;
  const velocity = sample.ball?.velocity;
  const travel = TMP_BALL_TRAVEL.set(velocity?.[0] ?? 0, 0, velocity?.[2] ?? 0);

  if (travel.lengthSq() < BALL_CAMERA_MIN_TRAVEL_SPEED_SQ && selectedCar) {
    travel.copy(ballPosition).sub(TMP_CAR_POSITION.fromArray(selectedCar.position));
    travel.y = 0;
  }
  if (travel.lengthSq() < 0.0001) travel.set(0, 0, -1);
  travel.normalize();

  const position = TMP_CAMERA_POSITION
    .copy(ballPosition)
    .addScaledVector(travel, -BALL_CAMERA_DISTANCE)
    .add(PLAYER_CAMERA_HEIGHT_OFFSET.setY(BALL_CAMERA_HEIGHT));
  const target = TMP_CAMERA_TARGET.copy(ballPosition);
  if (velocity) target.add(TMP_BALL_TRAVEL.set(velocity[0], velocity[1], velocity[2]).multiplyScalar(BALL_CAMERA_LOOK_AHEAD_SECONDS));

  return {
    position: vectorToTuple(position),
    target: vectorToTuple(target),
    up: [0, 1, 0],
    fov: 72
  };
}

export function directorTargetPlayerId(sample: SampledReplayState, events: ReplayEvent[] = []): string | undefined {
  const eventPlayerId = nearestDirectorEventPlayerId(sample.t, events);
  if (eventPlayerId && sample.cars[eventPlayerId]) return eventPlayerId;

  if (!sample.ball) return firstSampledCarId(sample);
  const ball = TMP_NEAREST_BALL_POSITION.fromArray(sample.ball.position);
  let bestId: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const id in sample.cars) {
    if (!Object.prototype.hasOwnProperty.call(sample.cars, id)) continue;
    const car = sample.cars[id];
    const distance = TMP_NEAREST_CAR_POSITION.fromArray(car.position).distanceToSquared(ball);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = id;
    }
  }

  return bestId;
}

function firstSampledCarId(sample: SampledReplayState): string | undefined {
  for (const id in sample.cars) {
    if (Object.prototype.hasOwnProperty.call(sample.cars, id)) return id;
  }
  return undefined;
}

function nearestDirectorEventPlayerId(timeSeconds: number, events: ReplayEvent[]): string | undefined {
  const sortedEvents = directorEventsFor(events);
  let nearestPlayerId: string | undefined;
  let nearestDelta = DIRECTOR_EVENT_LOOKBACK_SECONDS;
  let nearestOriginalIndex = Number.POSITIVE_INFINITY;
  const lowerBound = firstDirectorEventIndexAtOrAfter(sortedEvents, timeSeconds - DIRECTOR_EVENT_LOOKBACK_SECONDS);
  const upperTime = timeSeconds + DIRECTOR_EVENT_LOOKBACK_SECONDS;

  for (let index = lowerBound; index < sortedEvents.length; index++) {
    const candidate = sortedEvents[index];
    if (candidate.event.t >= upperTime) break;

    const delta = Math.abs(candidate.event.t - timeSeconds);
    if (delta < nearestDelta || (delta === nearestDelta && candidate.index < nearestOriginalIndex)) {
      nearestPlayerId = candidate.focusPlayerId;
      nearestDelta = delta;
      nearestOriginalIndex = candidate.index;
    }
  }

  return nearestPlayerId;
}

function directorEventsFor(events: ReplayEvent[]): DirectorEventEntry[] {
  const cached = directorEventCache.get(events);
  if (cached) return cached;

  const sortedEvents: DirectorEventEntry[] = [];
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const focusPlayerId = eventPlayerIdForCamera(event);
    if (focusPlayerId) sortedEvents.push({ event, focusPlayerId, index });
  }
  sortedEvents.sort((a, b) => a.event.t - b.event.t || a.index - b.index);
  directorEventCache.set(events, sortedEvents);
  return sortedEvents;
}

function firstDirectorEventIndexAtOrAfter(events: DirectorEventEntry[], timeSeconds: number) {
  let low = 0;
  let high = events.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (events[mid].event.t < timeSeconds) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
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
  const forward = TMP_FORWARD.set(1, 0, 0).applyQuaternion(quaternion);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) return TMP_FORWARD.set(1, 0, 0);
  return forward.normalize();
}

function playerCameraLookDirection(usingBallCam: boolean, carPosition: Vector3, forward: Vector3, ballPosition: Vector3) {
  if (!usingBallCam) return forward;

  TMP_BALL_DIRECTION.copy(ballPosition).sub(carPosition);
  TMP_BALL_DIRECTION.y = 0;
  if (TMP_BALL_DIRECTION.lengthSq() < 0.0001) return forward;
  return TMP_BALL_DIRECTION.normalize();
}

function vectorToTuple(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function setCameraLookAt(
  cameraPosition: Vector3,
  target: Vector3,
  camera: { position: Vector3; lookAt: (v: Vector3) => void },
  deltaSeconds = 1 / 60
) {
  camera.position.lerp(cameraPosition, cameraSmoothingAlpha(deltaSeconds, 30));
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
  speed = FREE_CAMERA_KEYBOARD_MOVE_SPEED,
  target = new Vector3(),
  forward = new Vector3(),
  right = new Vector3()
): Vector3 {
  camera.getWorldDirection(forward);
  if (forward.lengthSq() < 0.0001) {
    forward.set(0, 0, -1);
  } else {
    forward.normalize();
  }

  right.copy(forward).cross(WORLD_UP);
  if (right.lengthSq() < 0.0001) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }

  target.set(0, 0, 0);
  if (activeIntents.has("forward")) target.add(forward);
  if (activeIntents.has("backward")) target.sub(forward);
  if (activeIntents.has("right")) target.add(right);
  if (activeIntents.has("left")) target.sub(right);
  if (activeIntents.has("up")) target.add(WORLD_UP);
  if (activeIntents.has("down")) target.sub(WORLD_UP);

  if (target.lengthSq() > 1) target.normalize();
  return target.multiplyScalar(Math.max(0, deltaSeconds) * speed);
}
