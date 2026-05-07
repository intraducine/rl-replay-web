import type { ReplayInspection } from "./types";

export function summarizeInspection(inspection: ReplayInspection): string[] {
  return [
    `${inspection.frameStats.totalFrames.toLocaleString()} frames`,
    `${inspection.actorClasses.length.toLocaleString()} actor classes`,
    `${inspection.propertyNames.length.toLocaleString()} properties`,
    `${inspection.candidateActors.ball.length} ball candidates`,
    `${inspection.candidateActors.cars.length} car candidates`
  ];
}

export function emptyInspectionWarning(message: string): ReplayInspection {
  return {
    header: {},
    properties: {},
    actorClasses: [],
    propertyNames: [],
    players: [],
    candidateActors: { ball: [], cars: [], players: [], teams: [] },
    frameStats: { totalFrames: 0, framesWithBall: 0, framesWithCars: 0 },
    warnings: [message]
  };
}
