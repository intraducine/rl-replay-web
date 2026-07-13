import type { BoostPad } from "../replay/standardArenaBoostPads";
import { standardArenaBoostPads } from "../replay/standardArenaBoostPads";
import type { CarFrame, ReplayTimeline, Vec3 } from "../replay/types";

export const SMALL_BOOST_AMOUNT = 12;
export const SMALL_BOOST_RESPAWN_SECONDS = 4;
export const LARGE_BOOST_RESPAWN_SECONDS = 10;

const MINIMUM_PICKUP_GAIN = 0.75;
const MAXIMUM_PICKUP_HEIGHT = 190;
const PICKUP_RADIUS = {
  small: 185,
  large: 225
} as const;

export type BoostPadPickup = {
  padId: number;
  playerId: string;
  t: number;
};

export type BoostPadPlaybackState = {
  active: boolean;
  energy: number;
  lastPickupTime?: number;
  respawnTime?: number;
};

export function boostPadScenePosition(pad: BoostPad): Vec3 {
  const [x, y, z] = pad.position;
  return [x, z, -y];
}

export function boostPadRespawnSeconds(pad: BoostPad): number {
  return pad.type === "large" ? LARGE_BOOST_RESPAWN_SECONDS : SMALL_BOOST_RESPAWN_SECONDS;
}

export function inferBoostPadPickups(timeline: ReplayTimeline): Map<number, BoostPadPickup[]> {
  const pickups = new Map<number, BoostPadPickup[]>();
  const padReadyAt = new Map<number, number>();

  for (let frameIndex = 1; frameIndex < timeline.frames.length; frameIndex += 1) {
    const previousFrame = timeline.frames[frameIndex - 1];
    const currentFrame = timeline.frames[frameIndex];
    if (currentFrame.t <= previousFrame.t) continue;

    for (const [playerId, currentCar] of Object.entries(currentFrame.cars)) {
      const previousCar = previousFrame.cars[playerId];
      if (!isBoostGain(previousCar, currentCar)) continue;

      const pickup = closestAvailablePad(previousCar, currentCar, previousFrame.t, currentFrame.t, padReadyAt);
      if (!pickup) continue;

      const event = { padId: pickup.pad.id, playerId, t: pickup.t };
      const padPickups = pickups.get(pickup.pad.id) ?? [];
      padPickups.push(event);
      pickups.set(pickup.pad.id, padPickups);
      padReadyAt.set(pickup.pad.id, pickup.t + boostPadRespawnSeconds(pickup.pad));
    }
  }

  return pickups;
}

export function boostPadPlaybackStateAt(pad: BoostPad, pickups: BoostPadPickup[] | undefined, time: number): BoostPadPlaybackState {
  const lastPickup = latestPickupAtOrBefore(pickups, time);
  if (!lastPickup) return { active: true, energy: 1 };

  const respawnTime = lastPickup.t + boostPadRespawnSeconds(pad);
  if (time < respawnTime) {
    const pickupFade = 1 - smoothstep(0, 0.1, time - lastPickup.t);
    return {
      active: false,
      energy: pickupFade,
      lastPickupTime: lastPickup.t,
      respawnTime
    };
  }

  return {
    active: true,
    energy: smoothstep(0, 0.18, time - respawnTime),
    lastPickupTime: lastPickup.t,
    respawnTime
  };
}

function isBoostGain(previous: CarFrame | undefined, current: CarFrame): previous is CarFrame {
  return (
    previous !== undefined
    && previous.boost !== undefined
    && current.boost !== undefined
    && current.boost - previous.boost >= MINIMUM_PICKUP_GAIN
    && current.demolished !== true
  );
}

function closestAvailablePad(
  previousCar: CarFrame,
  currentCar: CarFrame,
  previousTime: number,
  currentTime: number,
  padReadyAt: Map<number, number>
): { pad: BoostPad; t: number } | undefined {
  let closest: { pad: BoostPad; t: number; normalizedDistance: number } | undefined;

  for (const pad of standardArenaBoostPads) {
    const approach = closestApproach(previousCar.position, currentCar.position, boostPadScenePosition(pad));
    const radius = PICKUP_RADIUS[pad.type];
    if (approach.height > MAXIMUM_PICKUP_HEIGHT || approach.horizontalDistance > radius) continue;

    const pickupTime = previousTime + (currentTime - previousTime) * approach.alpha;
    if ((padReadyAt.get(pad.id) ?? Number.NEGATIVE_INFINITY) > pickupTime) continue;

    const normalizedDistance = approach.horizontalDistance / radius;
    if (!closest || normalizedDistance < closest.normalizedDistance) {
      closest = { pad, t: pickupTime, normalizedDistance };
    }
  }

  return closest;
}

function closestApproach(start: Vec3, end: Vec3, target: Vec3) {
  const segmentX = end[0] - start[0];
  const segmentZ = end[2] - start[2];
  const segmentLengthSquared = segmentX * segmentX + segmentZ * segmentZ;
  const alpha = segmentLengthSquared === 0
    ? 1
    : clamp01(((target[0] - start[0]) * segmentX + (target[2] - start[2]) * segmentZ) / segmentLengthSquared);
  const closestX = start[0] + segmentX * alpha;
  const closestY = start[1] + (end[1] - start[1]) * alpha;
  const closestZ = start[2] + segmentZ * alpha;

  return {
    alpha,
    height: Math.abs(closestY - target[1]),
    horizontalDistance: Math.hypot(closestX - target[0], closestZ - target[2])
  };
}

function latestPickupAtOrBefore(pickups: BoostPadPickup[] | undefined, time: number): BoostPadPickup | undefined {
  if (!pickups?.length) return undefined;

  let low = 0;
  let high = pickups.length - 1;
  let latest: BoostPadPickup | undefined;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const pickup = pickups[middle];
    if (pickup.t <= time) {
      latest = pickup;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return latest;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
