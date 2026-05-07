import type { ReplayClockSample, ReplayTimeline } from "../replay/types";

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

export function scoreboardStateAt(timeline: ReplayTimeline, currentTime: number): ScoreboardState {
  const blueFinalScore = teamFinalScore(timeline, 0);
  const orangeFinalScore = teamFinalScore(timeline, 1);
  const goals = timeline.events
    .filter((event) => event.type === "goal")
    .sort((a, b) => a.t - b.t);
  const blueGoals = goals.filter((event) => event.team === 0);
  const orangeGoals = goals.filter((event) => event.team === 1);

  return {
    blueScore: Math.min(scoreFromGoals(blueGoals, currentTime), blueFinalScore),
    orangeScore: Math.min(scoreFromGoals(orangeGoals, currentTime), orangeFinalScore),
    ...clockStateAt(timeline, currentTime)
  };
}

export function clockStateAt(
  timeline: ReplayTimeline,
  currentTime: number
): Pick<ScoreboardState, "clockText" | "overtime"> {
  if (!hasMatchClockSamples(timeline.clock)) {
    return derivedClockStateAt(timeline, currentTime);
  }

  const sample = latestClockSampleAt(timeline.clock ?? [], currentTime);
  const matchLength = timeline.metadata.matchLengthSeconds ?? DEFAULT_MATCH_LENGTH_SECONDS;
  const overtime = sample?.overtime === true || (sample?.secondsRemaining ?? matchLength) < 0;

  if (overtime) {
    return {
      clockText: `+${formatClock(overtimeElapsedSeconds(timeline.clock ?? [], sample, currentTime, matchLength))}`,
      overtime: true
    };
  }

  const secondsRemaining = sample?.secondsRemaining ?? Math.max(0, matchLength - currentTime);
  return {
    clockText: formatClock(secondsRemaining),
    overtime: false
  };
}

function derivedClockStateAt(timeline: ReplayTimeline, currentTime: number): Pick<ScoreboardState, "clockText" | "overtime"> {
  const matchLength = timeline.metadata.matchLengthSeconds ?? DEFAULT_MATCH_LENGTH_SECONDS;
  const liveSeconds = boundedDerivedLiveSecondsAt(timeline, currentTime);
  const remaining = Math.max(0, matchLength - liveSeconds);
  const overtimeElapsed = Math.max(0, liveSeconds - matchLength);
  const overtime = overtimeElapsed > 0 && derivedScoreAt(timeline, 0, currentTime) === derivedScoreAt(timeline, 1, currentTime);

  return {
    clockText: overtime ? `+${formatClock(overtimeElapsed)}` : formatClock(remaining),
    overtime
  };
}

function boundedDerivedLiveSecondsAt(timeline: ReplayTimeline, currentTime: number) {
  const liveSeconds = derivedLiveSecondsAt(timeline, currentTime);
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

function derivedScoreAt(timeline: ReplayTimeline, team: 0 | 1, currentTime: number) {
  return scoreFromGoals(
    timeline.events.filter((event) => event.type === "goal" && event.team === team),
    currentTime
  );
}

function derivedLiveSecondsAt(timeline: ReplayTimeline, currentTime: number) {
  const goals = timeline.events
    .filter((event) => event.type === "goal")
    .sort((a, b) => a.t - b.t);
  const stops = goals.map((goal) => goal.t).filter((t) => t <= currentTime);
  const kickoffStarts = [0, ...stops];
  let liveSeconds = 0;

  for (let index = 0; index < kickoffStarts.length; index += 1) {
    const kickoffStart = kickoffStarts[index];
    const resume = kickoffResumeTime(timeline, kickoffStart);
    const segmentEnd = Math.min(stops[index] ?? currentTime, currentTime);
    if (segmentEnd > resume) {
      liveSeconds += segmentEnd - resume;
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
  return goals.filter((goal) => goal.t <= currentTime).length;
}

function teamFinalScore(timeline: ReplayTimeline, team: 0 | 1) {
  return timeline.metadata.teams?.find((candidate) => candidate.id === team)?.score ?? Number.MAX_SAFE_INTEGER;
}

function latestClockSampleAt(samples: ReplayClockSample[], currentTime: number) {
  let latest: ReplayClockSample | undefined;
  for (const sample of samples) {
    if (sample.t > currentTime) {
      break;
    }
    latest = sample;
  }
  return latest;
}

function overtimeElapsedSeconds(
  samples: ReplayClockSample[],
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

  const overtimeStart = samples.find(
    (candidate) => candidate.overtime === true || (candidate.secondsRemaining ?? matchLength) < 0
  );
  return Math.max(0, currentTime - (overtimeStart?.t ?? currentTime));
}

function formatClock(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
