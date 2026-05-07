import { transformRigidBodyToThree, type CoordinateDebugOptions } from "../math/coordinateSystem";
import type { ReplayTimeline, TimelineFrame } from "./types";

export function normalizeTimelineCoordinates(
  timeline: ReplayTimeline,
  options: CoordinateDebugOptions = {}
): ReplayTimeline {
  return {
    ...timeline,
    frames: timeline.frames.map((frame): TimelineFrame => {
      const cars = Object.fromEntries(
        Object.entries(frame.cars).map(([id, car]) => [id, transformRigidBodyToThree(car, options)])
      );

      return {
        ...frame,
        ball: frame.ball ? transformRigidBodyToThree(frame.ball, options) : undefined,
        cars
      };
    })
  };
}
