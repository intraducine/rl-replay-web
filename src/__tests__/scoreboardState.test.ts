import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ReplayTimeline } from "../replay/types";
import { scoreboardStateAt } from "../viewer/scoreboardState";

const timeline: ReplayTimeline = {
  version: 1,
  metadata: {
    id: "scoreboard",
    fileName: "scoreboard.replay",
    durationSeconds: 380,
    matchLengthSeconds: 300,
    createdAt: 0,
    parserVersion: "test",
    players: [],
    teams: [
      { id: 0, name: "Blue", score: 2 },
      { id: 1, name: "Orange", score: 1 }
    ]
  },
  frames: [],
  events: [
    { type: "goal", t: 42, team: 0 },
    { type: "goal", t: 88, team: 1 },
    { type: "goal", t: 180, team: 0 }
  ],
  clock: [
    { t: 0, gameTimeSeconds: 300, secondsRemaining: 300, overtime: false, ballHasBeenHit: false },
    { t: 3, gameTimeSeconds: 300, secondsRemaining: 300, overtime: false, ballHasBeenHit: true },
    { t: 42, gameTimeSeconds: 300, secondsRemaining: 261, overtime: false, ballHasBeenHit: false },
    { t: 47, gameTimeSeconds: 300, secondsRemaining: 261, overtime: false, ballHasBeenHit: true },
    { t: 88, gameTimeSeconds: 300, secondsRemaining: 220, overtime: false, ballHasBeenHit: false },
    { t: 93, gameTimeSeconds: 300, secondsRemaining: 220, overtime: false, ballHasBeenHit: true },
    { t: 340, gameTimeSeconds: 300, secondsRemaining: 0, overtime: true, ballHasBeenHit: false },
    { t: 350, gameTimeSeconds: 315, secondsRemaining: 0, overtime: true, ballHasBeenHit: true }
  ]
};

describe("scoreboardStateAt", () => {
  it("uses a cached scoreboard index instead of filtering goals and clock samples every tick", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/scoreboardState.ts"), "utf8");

    expect(source).toContain("scoreboardIndexCache");
    expect(source).toContain("scoreboardIndexForTimeline(timeline)");
    expect(source).toContain("function scoreFromGoals");
    expect(source).toContain("while (low < high)");
    expect(source).toContain("function latestClockSampleAt");
    expect(source).toContain("kickoffSegmentsForTimeline");
    expect(source).not.toContain("goals.filter((goal) => goal.t <= currentTime).length");
    expect(source).toContain("blueFinalScore");
    expect(source).toContain("orangeFinalScore");
    expect(source).not.toContain("blueGoals: goals.filter");
    expect(source).not.toContain("orangeGoals: goals.filter");
    expect(source).not.toContain("const kickoffStarts = [0, ...goals.map");
  });

  it("counts goals only after they happen", () => {
    expect(scoreboardStateAt(timeline, 41)).toMatchObject({ blueScore: 0, orangeScore: 0 });
    expect(scoreboardStateAt(timeline, 42)).toMatchObject({ blueScore: 1, orangeScore: 0 });
    expect(scoreboardStateAt(timeline, 100)).toMatchObject({ blueScore: 1, orangeScore: 1 });
    expect(scoreboardStateAt(timeline, 181)).toMatchObject({ blueScore: 2, orangeScore: 1 });
  });

  it("uses replay clock samples so scoring pauses freeze the clock", () => {
    expect(scoreboardStateAt(timeline, 41).clockText).toBe("5:00");
    expect(scoreboardStateAt(timeline, 43).clockText).toBe("4:21");
    expect(scoreboardStateAt(timeline, 46).clockText).toBe("4:21");
  });

  it("formats overtime with a plus prefix", () => {
    expect(scoreboardStateAt(timeline, 350)).toMatchObject({ clockText: "+0:15", overtime: true });
  });

  it("starts overtime elapsed time when the replay enters overtime, not at regulation 0:00", () => {
    const overtimeTimeline: ReplayTimeline = {
      ...timeline,
      clock: [
        { t: 340, secondsRemaining: 0, overtime: false },
        { t: 350, secondsRemaining: 0, overtime: true }
      ]
    };

    expect(scoreboardStateAt(overtimeTimeline, 355)).toMatchObject({ clockText: "+0:05", overtime: true });
  });

  it("does not treat regulation 0:00 as overtime unless the replay says overtime", () => {
    const regulationEnd: ReplayTimeline = {
      ...timeline,
      clock: [{ t: 341, secondsRemaining: 0, overtime: false }]
    };

    expect(scoreboardStateAt(regulationEnd, 341)).toMatchObject({ clockText: "0:00", overtime: false });
  });

  it("derives kickoff and goal pauses from frames when replay clock samples are missing", () => {
    const legacyTimeline: ReplayTimeline = {
      ...timeline,
      metadata: {
        ...timeline.metadata,
        durationSeconds: 341,
        matchLengthSeconds: 300
      },
      events: [
        { type: "goal", t: 20, team: 0 },
        { type: "goal", t: 80, team: 0 }
      ],
      clock: undefined,
      frames: [
        frame(0, 0),
        frame(5, 0),
        frame(6, 600),
        frame(19, 1900),
        frame(20, 5100),
        frame(24, 0),
        frame(28, 0),
        frame(30, 700),
        frame(79, 2100),
        frame(80, -5100),
        frame(84, 0),
        frame(88, 0),
        frame(91, -700),
        frame(341, 1200)
      ]
    };

    expect(scoreboardStateAt(legacyTimeline, 5).clockText).toBe("5:00");
    expect(scoreboardStateAt(legacyTimeline, 20).clockText).toBe("4:46");
    expect(scoreboardStateAt(legacyTimeline, 29).clockText).toBe("4:46");
    expect(scoreboardStateAt(legacyTimeline, 341).clockText).toBe("0:00");
  });

  it("uses total played seconds as the end-of-replay fallback for forfeited matches", () => {
    const forfeitedReplay: ReplayTimeline = {
      ...timeline,
      metadata: {
        ...timeline.metadata,
        durationSeconds: 341,
        matchLengthSeconds: 300,
        totalSecondsPlayed: 270,
        forfeit: true
      },
      events: [{ type: "goal", t: 338, team: 0 }],
      clock: undefined,
      frames: [frame(0, 0), frame(6, 700), frame(338, 5100), frame(341, 5100)]
    };

    expect(scoreboardStateAt(forfeitedReplay, 341).clockText).toBe("0:30");
  });
});

function frame(t: number, ballY: number) {
  return {
    t,
    ball: {
      position: [0, ballY, 93] as [number, number, number],
      rotation: [0, 0, 0, 1] as [number, number, number, number],
      velocity: [0, 0, 0] as [number, number, number]
    },
    cars: {}
  };
}
