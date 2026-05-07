export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export type ReplayMetadata = {
  id: string;
  fileName: string;
  replayName?: string;
  mapName?: string;
  date?: string;
  durationSeconds: number;
  matchLengthSeconds?: number;
  totalSecondsPlayed?: number;
  forfeit?: boolean;
  matchGuid?: string;
  matchType?: string;
  teamSize?: number;
  unfairTeamSize?: number;
  playlist?: number;
  serverRegion?: string;
  gameServerId?: string;
  buildVersion?: string;
  buildId?: number;
  changelist?: number;
  gameVersion?: number;
  replayVersion?: number;
  replayLastSaveVersion?: number;
  createdAt: number;
  parserVersion: string;
  players: ReplayPlayer[];
  teams?: ReplayTeam[];
  source?: "wasm" | "mock" | "fallback";
};

export type ReplayTeam = {
  id: 0 | 1;
  name: string;
  score: number;
};

export type ReplayPlayer = {
  id: string;
  name: string;
  team: 0 | 1;
  carActorId?: number;
  platformId?: string;
  platform?: string;
  stats?: ReplayPlayerStats;
  cosmetics?: ReplayPlayerCosmetics;
  ping?: number;
  title?: string;
  clubId?: string;
};

export type ReplayPlayerStats = {
  score: number;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  demos?: number;
};

export type ReplayPlayerCosmetics = {
  teamPaint?: ReplayTeamPaint;
  loadout?: ReplayLoadout;
};

export type ReplayTeamPaint = {
  team: 0 | 1;
  primaryColor: number;
  accentColor: number;
  primaryFinish?: number;
  accentFinish?: number;
};

export type ReplayLoadout = {
  body?: number;
  decal?: number;
  wheels?: number;
  boost?: number;
  antenna?: number;
  topper?: number;
  engineAudio?: number;
  trail?: number;
  goalExplosion?: number;
  banner?: number;
};

export type RigidBodyFrame = {
  position: Vec3;
  rotation: Quat;
  velocity?: Vec3;
  angularVelocity?: Vec3;
};

export type CarFrame = RigidBodyFrame & {
  boost?: number;
  boostActive?: boolean;
  demolished?: boolean;
  supersonic?: boolean;
};

export type TimelineFrame = {
  t: number;
  ball?: RigidBodyFrame;
  cars: Record<string, CarFrame>;
};

export type ReplayEvent =
  | { type: "goal"; t: number; scorerId?: string; team: 0 | 1; label?: string }
  | { type: "demo"; t: number; attackerId?: string; victimId?: string; label?: string }
  | { type: "shot"; t: number; playerId?: string; label?: string }
  | { type: "save"; t: number; playerId?: string; label?: string };

export type ReplayTimeline = {
  version: 1;
  metadata: ReplayMetadata;
  frames: TimelineFrame[];
  events: ReplayEvent[];
  clock?: ReplayClockSample[];
};

export type ReplayClockSample = {
  t: number;
  secondsRemaining?: number;
  stateTimeRemaining?: number;
  gameTimeSeconds?: number;
  overtime?: boolean;
  ballHasBeenHit?: boolean;
};

export type SampledReplayState = {
  t: number;
  ball?: RigidBodyFrame;
  cars: Record<string, CarFrame>;
};

export type ReplayInspection = {
  header: Record<string, unknown>;
  properties: Record<string, unknown>;
  actorClasses: string[];
  propertyNames: string[];
  players: ReplayPlayer[];
  candidateActors: {
    ball: number[];
    cars: number[];
    players: number[];
    teams: number[];
  };
  frameStats: {
    totalFrames: number;
    framesWithBall: number;
    framesWithCars: number;
  };
  warnings: string[];
};

export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};
