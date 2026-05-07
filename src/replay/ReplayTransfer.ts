import type { CarFrame, ReplayTimeline, RigidBodyFrame, TimelineFrame, Vec3, Quat } from "./types";

const TIME_DECIMALS = 3;
const POSITION_DECIMALS = 2;
const VELOCITY_DECIMALS = 2;
const ROTATION_DECIMALS = 5;
const BOOST_DECIMALS = 2;

export function prepareTimelineForTransfer(timeline: ReplayTimeline): ReplayTimeline {
  const metadata = {
    ...timeline.metadata,
    durationSeconds: roundNumber(timeline.metadata.durationSeconds, TIME_DECIMALS),
    createdAt: Math.round(timeline.metadata.createdAt)
  };
  if (timeline.metadata.totalSecondsPlayed !== undefined) {
    metadata.totalSecondsPlayed = roundNumber(timeline.metadata.totalSecondsPlayed, TIME_DECIMALS);
  }

  const prepared: ReplayTimeline = {
    ...timeline,
    metadata,
    frames: timeline.frames.map(prepareFrameForTransfer),
    events: timeline.events.map((event) => ({ ...event, t: roundNumber(event.t, TIME_DECIMALS) }))
  };

  if (timeline.clock) {
    prepared.clock = timeline.clock.map((sample) => ({ ...sample, t: roundNumber(sample.t, TIME_DECIMALS) }));
  }

  return prepared;
}

function prepareFrameForTransfer(frame: TimelineFrame): TimelineFrame {
  return {
    t: roundNumber(frame.t, TIME_DECIMALS),
    ball: frame.ball ? prepareRigidBodyForTransfer(frame.ball) : undefined,
    cars: Object.fromEntries(Object.entries(frame.cars).map(([id, car]) => [id, prepareCarForTransfer(car)]))
  };
}

function prepareRigidBodyForTransfer(frame: RigidBodyFrame): RigidBodyFrame {
  return {
    position: roundVec3(frame.position, POSITION_DECIMALS),
    rotation: roundQuat(frame.rotation, ROTATION_DECIMALS),
    velocity: frame.velocity ? roundVec3(frame.velocity, VELOCITY_DECIMALS) : undefined,
    angularVelocity: frame.angularVelocity ? roundVec3(frame.angularVelocity, VELOCITY_DECIMALS) : undefined
  };
}

function prepareCarForTransfer(frame: CarFrame): CarFrame {
  return {
    ...prepareRigidBodyForTransfer(frame),
    boost: frame.boost === undefined ? undefined : roundNumber(frame.boost, BOOST_DECIMALS),
    boostActive: frame.boostActive,
    demolished: frame.demolished,
    supersonic: frame.supersonic
  };
}

function roundVec3(vector: Vec3, decimals: number): Vec3 {
  return [roundNumber(vector[0], decimals), roundNumber(vector[1], decimals), roundNumber(vector[2], decimals)];
}

function roundQuat(quaternion: Quat, decimals: number): Quat {
  return [
    roundNumber(quaternion[0], decimals),
    roundNumber(quaternion[1], decimals),
    roundNumber(quaternion[2], decimals),
    roundNumber(quaternion[3], decimals)
  ];
}

function roundNumber(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}
