import type { CarFrame, ReplayCameraSample, ReplayTimeline, RigidBodyFrame, TimelineFrame, Vec3, Quat } from "./types";

const TIME_DECIMALS = 3;
const POSITION_DECIMALS = 2;
const VELOCITY_DECIMALS = 2;
const ROTATION_DECIMALS = 5;
const BOOST_DECIMALS = 2;
const CAMERA_DECIMALS = 3;

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
  if (timeline.camera) {
    prepared.camera = timeline.camera.map(prepareCameraForTransfer);
  }

  return prepared;
}

function prepareCameraForTransfer(sample: ReplayCameraSample): ReplayCameraSample {
  return {
    ...sample,
    t: roundNumber(sample.t, TIME_DECIMALS),
    settings: sample.settings
      ? {
          fov: roundNumber(sample.settings.fov, CAMERA_DECIMALS),
          height: roundNumber(sample.settings.height, CAMERA_DECIMALS),
          angle: roundNumber(sample.settings.angle, CAMERA_DECIMALS),
          distance: roundNumber(sample.settings.distance, CAMERA_DECIMALS),
          stiffness: roundNumber(sample.settings.stiffness, CAMERA_DECIMALS),
          swivel: roundNumber(sample.settings.swivel, CAMERA_DECIMALS),
          transition: sample.settings.transition === undefined ? undefined : roundNumber(sample.settings.transition, CAMERA_DECIMALS)
        }
      : undefined
  };
}

function prepareFrameForTransfer(frame: TimelineFrame): TimelineFrame {
  const cars: TimelineFrame["cars"] = {};
  for (const id in frame.cars) {
    if (Object.prototype.hasOwnProperty.call(frame.cars, id)) {
      cars[id] = prepareCarForTransfer(frame.cars[id]);
    }
  }

  return {
    t: roundNumber(frame.t, TIME_DECIMALS),
    ball: frame.ball ? prepareRigidBodyForTransfer(frame.ball) : undefined,
    cars
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
