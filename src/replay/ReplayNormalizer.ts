import { transformRigidBodyToThree, type CoordinateDebugOptions } from "../math/coordinateSystem";
import type { ReplayTimeline, TimelineFrame } from "./types";

export function normalizeTimelineCoordinates(
  timeline: ReplayTimeline,
  options: CoordinateDebugOptions = {}
): ReplayTimeline {
  return {
    ...timeline,
    frames: timeline.frames.map((frame): TimelineFrame => {
      const cars: TimelineFrame["cars"] = {};
      for (const id in frame.cars) {
        if (Object.prototype.hasOwnProperty.call(frame.cars, id)) {
          cars[id] = transformRigidBodyToThree(frame.cars[id], options);
        }
      }

      return {
        ...frame,
        ball: frame.ball ? transformRigidBodyToThree(frame.ball, options) : undefined,
        cars
      };
    })
  };
}
