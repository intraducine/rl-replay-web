import type { ReplayClockSample, ReplayEvent, ReplayTimeline } from "../replay/types";

const DEFAULT_MATCH_LENGTH_SECONDS = 300;
const KICKOFF_BALL_CENTER_RADIUS = 220;
const KICKOFF_BALL_IN_PLAY_RADIUS = 360;
const KICKOFF_AUTO_RESUME_SECONDS = 10;

export type ScoreboardState = {
  blueScore: number;
  orangeScore: number;
  clockText: string;
  overtime: boolean;
};

type GoalEvent = Extract<ReplayEvent, { type: "goal" }>;

type KickoffSegment = {
  start: number;
  resume: number;
  end?: number;
};

type ScoreboardIndex = {
  goals: GoalEvent[];
  blueGoals: GoalEvent[];
  orangeGoals: GoalEvent[];
  clockSamples: ReplayClockSample[];
  hasMatchClockSamples: boolean;
  overtimeStart?: ReplayClockSample;
  kickoffSegments: KickoffSegment[];
};

const scoreboardIndexCache = new WeakMap<ReplayTimeline, ScoreboardIndex>();

export function scoreboardStateAt(timeline: ReplayTimeline, currentTime: number): ScoreboardState {
  const index = scoreboardIndexForTimeline(timeline);
  const blueFinalScore = teamFinalScore(timeline, 0);
  const orangeFinalScore = teamFinalScore(timeline, 1);

  return {
    blueScore: Math.min(scoreFromGoals(index.blueGoals, currentTime), blueFinalScore),
    orangeScore: Math.min(scoreFromGoals(index.orangeGoals, currentTime), orangeFinalScore),
    ...clockStateAt(timeline, currentTime, index)
  };
}

export function clockStateAt(
  timeline: ReplayTimeline,
  currentTime: number,
  index = scoreboardIndexForTimeline(timeline)
): Pick<ScoreboardState, "clockText" | "overtime"> {
  if (!index.hasMatchClockSamples) {
    return derivedClockStateAt(timeline, currentTime, index);
  }

  const sample = latestClockSampleAt(index.clockSamples, currentTime);
  const matchLength = timeline.metadata.matchLengthSeconds ?? DEFAULT_MATCH_LENGTH_SECONDS;
  const overtime = sample?.overtime === true || (sample?.secondsRemaining ?? matchLength) < 0;

  if (overtime) {
    return {
      clockText: `+${formatClock(overtimeElapsedSeconds(index, sample, currentTime, matchLength))}`,
      overtime: true
    };
  }

  const secondsRemaining = sample?.secondsRemaining ?? Math.max(0, matchLength - currentTime);
  return {
    clockText: formatClock(secondsRemaining),
    overtime: false
  };
}

function derivedClockStateAt(timeline: ReplayTimeline, currentTime: number, index: ScoreboardIndex): Pick<ScoreboardState, "clockText" | "overtime"> {
  const matchLength = timeline.metadata.matchLengthSeconds ?? DEFAULT_MATCH_LENGTH_SECONDS;
  const liveSeconds = boundedDerivedLiveSecondsAt(timeline, currentTime, index);
  const remaining = Math.max(0, matchLength - liveSeconds);
  const overtimeElapsed = Math.max(0, liveSeconds - matchLength);
  const overtime = overtimeElapsed > 0 && scoreFromGoals(index.blueGoals, currentTime) === scoreFromGoals(index.orangeGoals, currentTime);

  return {
    clockText: overtime ? `+${formatClock(overtimeElapsed)}` : formatClock(remaining),
    overtime
  };
}

function boundedDerivedLiveSecondsAt(timeline: ReplayTimeline, currentTime: number, index: ScoreboardIndex) {
  const liveSeconds = derivedLiveSecondsAt(index, currentTime);
  const totalPlayed = timeline.metadata.totalSecondsPlayed;
  if (totalPlayed === undefined) {
    return liveSeconds;
  }

  const nearReplayEnd = currentTime >= timeline.metadata.durationSeconds - 0.5;
  if (nearReplayEnd) {
    return totalPlayed;
  }

  return Math.min(liveSeconds, totalPlayed);
}

function derivedLiveSecondsAt(index: ScoreboardIndex, currentTime: number) {
  let liveSeconds = 0;

  for (const segment of index.kickoffSegments) {
    if (segment.start > currentTime) break;
    const segmentEnd = Math.min(segment.end ?? currentTime, currentTime);
    if (segmentEnd > segment.resume) {
      liveSeconds += segmentEnd - segment.resume;
    }
  }

  return liveSeconds;
}

function kickoffResumeTime(timeline: ReplayTimeline, kickoffStart: number) {
  let centeredAt: number | undefined;

  for (const frame of timeline.frames) {
    if (frame.t < kickoffStart || !frame.ball) {
      continue;
    }

    const radius = Math.hypot(frame.ball.position[0], frame.ball.position[1]);
    if (centeredAt === undefined) {
      if (radius <= KICKOFF_BALL_CENTER_RADIUS) {
        centeredAt = frame.t;
      }
      continue;
    }

    if (radius >= KICKOFF_BALL_IN_PLAY_RADIUS) {
      return frame.t;
    }

    if (frame.t - centeredAt >= KICKOFF_AUTO_RESUME_SECONDS) {
      return frame.t;
    }
  }

  return centeredAt === undefined ? kickoffStart + KICKOFF_AUTO_RESUME_SECONDS : centeredAt + KICKOFF_AUTO_RESUME_SECONDS;
}

function hasMatchClockSamples(samples: ReplayClockSample[] | undefined) {
  return Boolean(samples?.some((sample) => sample.secondsRemaining !== undefined || sample.overtime === true));
}

function scoreFromGoals(goals: Array<{ t: number }>, currentTime: number) {
  let low = 0;
  let high = goals.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (goals[mid].t <= currentTime) low = mid + 1;
    else high = mid;
  }
  return low;
}

function teamFinalScore(timeline: ReplayTimeline, team: 0 | 1) {
  return timeline.metadata.teams?.find((candidate) => candidate.id === team)?.score ?? Number.MAX_SAFE_INTEGER;
}

function latestClockSampleAt(samples: ReplayClockSample[], currentTime: number) {
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (samples[mid].t <= currentTime) low = mid + 1;
    else high = mid;
  }
  return samples[low - 1];
}

function overtimeElapsedSeconds(
  index: ScoreboardIndex,
  sample: ReplayClockSample | undefined,
  currentTime: number,
  matchLength: number
) {
  if (sample?.secondsRemaining !== undefined && sample.secondsRemaining < 0) {
    return Math.abs(sample.secondsRemaining);
  }
  if (sample?.gameTimeSeconds !== undefined && sample.gameTimeSeconds > matchLength) {
    return sample.gameTimeSeconds - matchLength;
  }

  return Math.max(0, currentTime - (index.overtimeStart?.t ?? currentTime));
}

function scoreboardIndexForTimeline(timeline: ReplayTimeline): ScoreboardIndex {
  const cached = scoreboardIndexCache.get(timeline);
  if (cached) return cached;

  const goals = timeline.events
    .filter((event): event is GoalEvent => event.type === "goal")
    .sort((a, b) => a.t - b.t);
  const clockSamples = [...(timeline.clock ?? [])].sort((a, b) => a.t - b.t);
  const index: ScoreboardIndex = {
    goals,
    blueGoals: goals.filter((event) => event.team === 0),
    orangeGoals: goals.filter((event) => event.team === 1),
    clockSamples,
    hasMatchClockSamples: hasMatchClockSamples(clockSamples),
    overtimeStart: clockSamples.find((sample) => sample.overtime === true || (sample.secondsRemaining ?? DEFAULT_MATCH_LENGTH_SECONDS) < 0),
    kickoffSegments: kickoffSegmentsForTimeline(timeline, goals)
  };

  scoreboardIndexCache.set(timeline, index);
  return index;
}

function kickoffSegmentsForTimeline(timeline: ReplayTimeline, goals: GoalEvent[]): KickoffSegment[] {
  const kickoffStarts = [0, ...goals.map((goal) => goal.t)];
  return kickoffStarts.map((start, index) => ({
    start,
    resume: kickoffResumeTime(timeline, start),
    end: goals[index]?.t
  }));
}

function formatClock(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
