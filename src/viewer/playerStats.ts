import type { ReplayTimeline } from "../replay/types";

export type LivePlayerStats = {
  score: number;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demos: number;
};

export function livePlayerStatsAt(timeline: ReplayTimeline, playerId: string, timeSeconds: number): LivePlayerStats {
  const stats: LivePlayerStats = { score: 0, goals: 0, assists: 0, saves: 0, shots: 0, demos: 0 };

  for (const event of timeline.events) {
    if (event.t > timeSeconds) continue;
    switch (event.type) {
      case "goal":
        if (event.scorerId === playerId) {
          stats.goals += 1;
          stats.score += 100;
        }
        break;
      case "shot":
        if (event.playerId === playerId) {
          stats.shots += 1;
          stats.score += 10;
        }
        break;
      case "save":
        if (event.playerId === playerId) {
          stats.saves += 1;
          stats.score += event.label === "EpicSave" ? 75 : 50;
        }
        break;
      case "demo":
        if (event.attackerId === playerId) {
          stats.demos += 1;
          stats.score += 20;
        }
        break;
    }
  }

  return stats;
}
