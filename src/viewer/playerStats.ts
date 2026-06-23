import type { ReplayTimeline } from "../replay/types";

export type LivePlayerStats = {
  goals: number;
  saves: number;
  shots: number;
  demos: number;
};

export function livePlayerStatsAt(timeline: ReplayTimeline, playerId: string, timeSeconds: number): LivePlayerStats {
  return livePlayerStatsByPlayerAt(timeline, timeSeconds)[playerId] ?? emptyLivePlayerStats();
}

export function livePlayerStatsByPlayerAt(timeline: ReplayTimeline, timeSeconds: number): Record<string, LivePlayerStats> {
  const statsByPlayer: Record<string, LivePlayerStats> = {};

  for (const event of timeline.events) {
    if (event.t > timeSeconds) continue;
    switch (event.type) {
      case "goal":
        if (event.scorerId) {
          statsForPlayer(statsByPlayer, event.scorerId).goals += 1;
        }
        break;
      case "shot":
        if (event.playerId) {
          statsForPlayer(statsByPlayer, event.playerId).shots += 1;
        }
        break;
      case "save":
        if (event.playerId) {
          statsForPlayer(statsByPlayer, event.playerId).saves += 1;
        }
        break;
      case "demo":
        if (event.attackerId) {
          statsForPlayer(statsByPlayer, event.attackerId).demos += 1;
        }
        break;
    }
  }

  return statsByPlayer;
}

export function emptyLivePlayerStats(): LivePlayerStats {
  return { goals: 0, saves: 0, shots: 0, demos: 0 };
}

function statsForPlayer(statsByPlayer: Record<string, LivePlayerStats>, playerId: string): LivePlayerStats {
  statsByPlayer[playerId] ??= emptyLivePlayerStats();
  return statsByPlayer[playerId];
}
