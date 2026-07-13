import { Camera, MathUtils, Quaternion, Vector3 } from "three";
import type { ReplayCameraSample, ReplayCameraSettings, ReplayEvent, ReplayTimeline, SampledReplayState } from "../replay/types";

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

export type CameraResponseRates = {
  position: number;
  target: number;
  up: number;
  fov: number;
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
const PLAYER_CAMERA_MIN_ORBIT_RADIUS = 135;
const PLAYER_CAMERA_SAFE_FOV_FRACTION = 0.48;
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
const TMP_CURRENT_CAMERA_OFFSET = new Vector3();
const TMP_DESIRED_CAMERA_OFFSET = new Vector3();
const TMP_CAMERA_TO_CAR = new Vector3();
const TMP_CAMERA_TO_TARGET = new Vector3();
const TMP_CURRENT_VIEW_DIRECTION = new Vector3();
const TMP_DESIRED_VIEW_DIRECTION = new Vector3();
const TMP_SAFE_VIEW_DIRECTION = new Vector3();
const TMP_SAFE_VIEW_ROTATION = new Quaternion();
const TMP_SAFE_VIEW_DELTA_ROTATION = new Quaternion();
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

export function smoothPlayerCameraOrbit(
  currentPosition: Vector3,
  desiredPosition: Vector3,
  carPosition: Vector3,
  alpha: number,
  output = currentPosition,
  maxYawStepRadians = Number.POSITIVE_INFINITY
): Vector3 {
  const currentOffset = TMP_CURRENT_CAMERA_OFFSET.copy(currentPosition).sub(carPosition);
  const desiredOffset = TMP_DESIRED_CAMERA_OFFSET.copy(desiredPosition).sub(carPosition);
  const desiredRadius = Math.max(PLAYER_CAMERA_MIN_ORBIT_RADIUS, Math.hypot(desiredOffset.x, desiredOffset.z));
  const rawCurrentRadius = Math.hypot(currentOffset.x, currentOffset.z);
  const currentRadius = MathUtils.clamp(
    rawCurrentRadius,
    PLAYER_CAMERA_MIN_ORBIT_RADIUS,
    Math.max(PLAYER_CAMERA_MIN_ORBIT_RADIUS, desiredRadius * 1.75)
  );
  const currentYaw =
    rawCurrentRadius > 0.001 ? Math.atan2(currentOffset.z, currentOffset.x) : Math.atan2(desiredOffset.z, desiredOffset.x);
  const desiredYaw = Math.atan2(desiredOffset.z, desiredOffset.x);
  const clampedAlpha = MathUtils.clamp(alpha, 0, 1);
  const yawDelta = MathUtils.euclideanModulo(desiredYaw - currentYaw + Math.PI, Math.PI * 2) - Math.PI;
  const maxYawStep = Math.max(0, maxYawStepRadians);
  const yawStep = MathUtils.clamp(yawDelta * clampedAlpha, -maxYawStep, maxYawStep);
  const yaw = currentYaw + yawStep;
  const radius = MathUtils.lerp(currentRadius, desiredRadius, clampedAlpha);
  const currentHeight = MathUtils.clamp(
    currentOffset.y,
    desiredOffset.y - desiredRadius,
    desiredOffset.y + desiredRadius
  );
  const height = MathUtils.lerp(currentHeight, desiredOffset.y, clampedAlpha);

  return output.set(carPosition.x + Math.cos(yaw) * radius, carPosition.y + height, carPosition.z + Math.sin(yaw) * radius);
}

export function smoothPlayerCameraTarget(
  cameraPosition: Vector3,
  currentViewDirection: Vector3,
  desiredTarget: Vector3,
  alpha: number,
  maxAngularStepRadians: number,
  output = desiredTarget
): Vector3 {
  const currentDirection = TMP_CURRENT_VIEW_DIRECTION.copy(currentViewDirection);
  const desiredDirection = TMP_DESIRED_VIEW_DIRECTION.copy(desiredTarget).sub(cameraPosition);
  const targetDistance = desiredDirection.length();
  if (currentDirection.lengthSq() < 0.000001 || !(targetDistance > 0.001)) return output.copy(desiredTarget);

  currentDirection.normalize();
  desiredDirection.multiplyScalar(1 / targetDistance);
  const angle = currentDirection.angleTo(desiredDirection);
  if (angle < 0.000001) return output.copy(desiredTarget);

  const maxStep = Math.max(0, maxAngularStepRadians);
  const rotationFraction = Math.min(MathUtils.clamp(alpha, 0, 1), maxStep / angle);
  TMP_SAFE_VIEW_DELTA_ROTATION.setFromUnitVectors(currentDirection, desiredDirection);
  TMP_SAFE_VIEW_ROTATION.identity().slerp(TMP_SAFE_VIEW_DELTA_ROTATION, rotationFraction);
  TMP_SAFE_VIEW_DIRECTION.copy(currentDirection).applyQuaternion(TMP_SAFE_VIEW_ROTATION).normalize();
  return output.copy(cameraPosition).addScaledVector(TMP_SAFE_VIEW_DIRECTION, targetDistance);
}

export function playerCameraMaxAngularStep(
  deltaSeconds: number,
  settings?: ReplayCameraSettings,
  ballCamTransitioning = false
): number {
  const degreesPerSecond = ballCamTransitioning
    ? MathUtils.clamp(210 + (settings?.transition ?? DEFAULT_CAMERA_SETTINGS.transition) * 50, 240, 330)
    : MathUtils.clamp(180 + (settings?.swivel ?? DEFAULT_CAMERA_SETTINGS.swivel) * 15, 220, 360);
  return MathUtils.degToRad(degreesPerSecond) * Math.max(0, deltaSeconds);
}

export function constrainPlayerCameraTarget(
  cameraPosition: Vector3,
  desiredTarget: Vector3,
  carPosition: Vector3,
  verticalFovDegrees: number,
  aspect: number,
  output = desiredTarget
): Vector3 {
  const cameraToCar = TMP_CAMERA_TO_CAR.copy(carPosition).sub(cameraPosition);
  const cameraToTarget = TMP_CAMERA_TO_TARGET.copy(desiredTarget).sub(cameraPosition);
  const carDistance = cameraToCar.length();
  const targetDistance = cameraToTarget.length();
  if (!(carDistance > 0.001) || !(targetDistance > 0.001)) return output.copy(carPosition);

  cameraToCar.multiplyScalar(1 / carDistance);
  cameraToTarget.multiplyScalar(1 / targetDistance);
  const verticalHalfFov = MathUtils.degToRad(MathUtils.clamp(verticalFovDegrees, 20, 170) * 0.5);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.max(0.1, aspect));
  const safeAngle = Math.min(verticalHalfFov, horizontalHalfFov) * PLAYER_CAMERA_SAFE_FOV_FRACTION;
  const carAngle = cameraToCar.angleTo(cameraToTarget);
  if (carAngle <= safeAngle) return output.copy(desiredTarget);

  TMP_SAFE_VIEW_DELTA_ROTATION.setFromUnitVectors(cameraToCar, cameraToTarget);
  TMP_SAFE_VIEW_ROTATION.identity().slerp(TMP_SAFE_VIEW_DELTA_ROTATION, safeAngle / carAngle);
  TMP_SAFE_VIEW_DIRECTION.copy(cameraToCar).applyQuaternion(TMP_SAFE_VIEW_ROTATION).normalize();
  return output.copy(cameraPosition).addScaledVector(TMP_SAFE_VIEW_DIRECTION, Math.max(carDistance, targetDistance));
}

export function ballCamTransitionDuration(settings?: ReplayCameraSettings): number {
  const transitionSpeed = Math.max(0.5, settings?.transition ?? DEFAULT_CAMERA_SETTINGS.transition);
  return MathUtils.clamp(0.6 / transitionSpeed, 0.22, 0.55);
}

export function replayCameraResponseRates(
  mode: CameraMode,
  settings?: ReplayCameraSettings,
  ballCamTransitioning = false
): CameraResponseRates {
  if (mode === "director") return { position: 10.5, target: 13.5, up: 12, fov: 10 };
  if (mode === "top-down" || mode === "ball") return { position: 14, target: 17, up: 14, fov: 12 };
  if (mode !== "player") return { position: 18, target: 20, up: 18, fov: 14 };

  if (ballCamTransitioning) {
    const transitionSpeed = settings?.transition ?? DEFAULT_CAMERA_SETTINGS.transition;
    const swivelSpeed = settings?.swivel ?? DEFAULT_CAMERA_SETTINGS.swivel;
    return {
      position: MathUtils.clamp(transitionSpeed * 7, 7, 20),
      target: MathUtils.clamp(swivelSpeed * 1.6, 8, 24),
      up: 16,
      fov: 12
    };
  }

  const stiffness = settings?.stiffness ?? DEFAULT_CAMERA_SETTINGS.stiffness;
  const followRate = MathUtils.clamp(20 + stiffness * 20, 20, 32);
  return { position: followRate, target: followRate + 4, up: 24, fov: 18 };
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
