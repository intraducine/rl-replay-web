import type { ReplayTeam } from "../replay/types";

export type TeamId = ReplayTeam["id"];

export const DEFAULT_TEAMS: Record<TeamId, ReplayTeam> = {
  0: { id: 0, name: "Blue", score: 0 },
  1: { id: 1, name: "Orange", score: 0 }
};

export const TEAM_COLORS: Record<TeamId, { className: "blue" | "orange"; carPaint: string }> = {
  0: { className: "blue", carPaint: "#006cff" },
  1: { className: "orange", carPaint: "#ff7a18" }
};

export function teamClassName(team: TeamId) {
  return TEAM_COLORS[team].className;
}

export function teamCarPaint(team: TeamId) {
  return TEAM_COLORS[team].carPaint;
}

const RL_BLUE_PALETTE = [
  "#0f4bd9",
  "#1264ff",
  "#1686ff",
  "#17a8ff",
  "#22c7ff",
  "#2de0d4",
  "#41d86c",
  "#9dd947"
];

const RL_ORANGE_PALETTE = [
  "#f5c84a",
  "#f49b32",
  "#e94a21",
  "#f36c24",
  "#d72735",
  "#c43b2d",
  "#a82f28",
  "#7f2a21"
];

export function rocketLeaguePaintColor(index: number | undefined, team: TeamId, fallback: string) {
  if (index === undefined) return fallback;
  const palette = team === 0 ? RL_BLUE_PALETTE : RL_ORANGE_PALETTE;
  const paletteIndex = Math.abs(Math.trunc(index)) % palette.length;
  return palette[paletteIndex] ?? fallback;
}

export function teamById(teams: ReplayTeam[] | undefined, id: TeamId) {
  return teams?.find((team) => team.id === id) ?? DEFAULT_TEAMS[id];
}
