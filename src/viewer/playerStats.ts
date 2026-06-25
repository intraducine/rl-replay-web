import type { ReplayEvent, ReplayTimeline } from "../replay/types";

export type LivePlayerStats = {
  goals: number;
  saves: number;
  shots: number;
  demos: number;
};

type StatEvent = Extract<ReplayEvent, { type: "goal" | "shot" | "save" | "demo" }>;

type StatSnapshot = {
  t: number;
  statsByPlayer: Record<string, LivePlayerStats>;
};

type StatTimelineIndex = {
  snapshots: StatSnapshot[];
};

const EMPTY_LIVE_PLAYER_STATS: LivePlayerStats = { goals: 0, saves: 0, shots: 0, demos: 0 };
const EMPTY_LIVE_PLAYER_STATS_BY_PLAYER: Record<string, LivePlayerStats> = {};
const statIndexCache = new WeakMap<ReplayTimeline, StatTimelineIndex>();

export function livePlayerStatsAt(timeline: ReplayTimeline, playerId: string, timeSeconds: number): LivePlayerStats {
  return livePlayerStatsByPlayerAt(timeline, timeSeconds)[playerId] ?? emptyLivePlayerStats();
}

export function livePlayerStatsByPlayerAt(timeline: ReplayTimeline, timeSeconds: number): Record<string, LivePlayerStats> {
  const snapshots = statIndexForTimeline(timeline).snapshots;
  if (snapshots.length === 0) return EMPTY_LIVE_PLAYER_STATS_BY_PLAYER;

  let low = 0;
  let high = snapshots.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (snapshots[mid].t <= timeSeconds) low = mid + 1;
    else high = mid;
  }

  return snapshots[low - 1]?.statsByPlayer ?? EMPTY_LIVE_PLAYER_STATS_BY_PLAYER;
}

export function emptyLivePlayerStats(): LivePlayerStats {
  return EMPTY_LIVE_PLAYER_STATS;
}

function statIndexForTimeline(timeline: ReplayTimeline): StatTimelineIndex {
  const cached = statIndexCache.get(timeline);
  if (cached) return cached;

  const events = statEventsForTimeline(timeline);
  const snapshots: StatSnapshot[] = [];
  let statsByPlayer: Record<string, LivePlayerStats> = EMPTY_LIVE_PLAYER_STATS_BY_PLAYER;

  for (const event of events) {
    statsByPlayer = { ...statsByPlayer };
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
    snapshots.push({ t: event.t, statsByPlayer });
  }

  const index = { snapshots };
  statIndexCache.set(timeline, index);
  return index;
}

function statsForPlayer(statsByPlayer: Record<string, LivePlayerStats>, playerId: string): LivePlayerStats {
  statsByPlayer[playerId] = { ...(statsByPlayer[playerId] ?? EMPTY_LIVE_PLAYER_STATS) };
  return statsByPlayer[playerId];
}

function statEventsForTimeline(timeline: ReplayTimeline): StatEvent[] {
  const events: StatEvent[] = [];
  for (const event of timeline.events) {
    if (isStatEvent(event)) events.push(event);
  }
  events.sort((a, b) => a.t - b.t);
  return events;
}

function isStatEvent(event: ReplayEvent): event is StatEvent {
  return event.type === "goal" || event.type === "shot" || event.type === "save" || event.type === "demo";
}
