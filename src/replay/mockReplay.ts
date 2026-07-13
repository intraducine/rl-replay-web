import type { ReplayMetadata, ReplayTimeline, TimelineFrame } from "./types";
import { createId } from "../utils/createId";

export function createMockMetadata(fileName = "mock.replay"): ReplayMetadata {
  return {
    id: createId(),
    fileName,
    replayName: fileName.replace(/\.replay$/i, ""),
    mapName: "DFH Stadium",
    date: "2026-01-27 01-10-35",
    durationSeconds: 120,
    matchLengthSeconds: 300,
    totalSecondsPlayed: 82,
    matchType: "Mock",
    teamSize: 2,
    createdAt: Date.now(),
    parserVersion: "mock-1",
    source: "mock",
    teams: [
      { id: 0, name: "Blue", score: 2 },
      { id: 1, name: "Orange", score: 1 }
    ],
    players: [
      { id: "blue-1", name: "Blue One", team: 0, carActorId: 101, platform: "OnlinePlatform_Steam", stats: mockStats(1, 1, 0, 3, 410), cosmetics: { teamPaint: { team: 0, primaryColor: 2, accentColor: 9 } } },
      { id: "blue-2", name: "Blue Two", team: 0, carActorId: 102, platform: "OnlinePlatform_Steam", stats: mockStats(1, 0, 1, 2, 320), cosmetics: { teamPaint: { team: 0, primaryColor: 4, accentColor: 10 } } },
      { id: "orange-1", name: "Orange One", team: 1, carActorId: 201, platform: "OnlinePlatform_Steam", stats: mockStats(0, 1, 1, 3, 350), cosmetics: { teamPaint: { team: 1, primaryColor: 11, accentColor: 4 } } },
      { id: "orange-2", name: "Orange Two", team: 1, carActorId: 202, platform: "OnlinePlatform_Steam", stats: mockStats(1, 0, 0, 2, 280), cosmetics: { teamPaint: { team: 1, primaryColor: 12, accentColor: 5 } } }
    ]
  };
}

export function createMockTimeline(fileName = "mock.replay"): ReplayTimeline {
  const metadata = createMockMetadata(fileName);
  const frames: TimelineFrame[] = [];

  for (let i = 0; i <= 1200; i++) {
    const t = i / 10;
    const phase = t / 120;
    const ballX = Math.sin(phase * Math.PI * 8) * 2800;
    const ballY = Math.cos(phase * Math.PI * 5) * 4300;
    const ballZ = 160 + Math.abs(Math.sin(phase * Math.PI * 10)) * 1100;

    frames.push({
      t,
      ball: {
        position: [ballX, ballY, ballZ],
        rotation: [0, Math.sin(t), 0, Math.cos(t)],
        velocity: [Math.cos(t) * 400, Math.sin(t) * 400, 0]
      },
      cars: {
        "blue-1": carFrame(-1800, -2600, t, 0),
        "blue-2": carFrame(1600, -1800, t, 0.7),
        "orange-1": carFrame(-1600, 2200, -t, 1.4),
        "orange-2": carFrame(1800, 3000, -t, 2.1)
      }
    });
  }

  return {
    version: 1,
    metadata,
    frames,
    events: [
      { type: "goal", t: 31, scorerId: "blue-1", team: 0 },
      { type: "shot", t: 67, playerId: "orange-1" },
      { type: "save", t: 73, playerId: "blue-2", label: "Save" },
      { type: "demo", t: 81, attackerId: "orange-1", victimId: "blue-1", label: "Demo" },
      { type: "goal", t: 89, scorerId: "orange-2", team: 1 }
    ],
    clock: [
      { t: 0, gameTimeSeconds: 300, secondsRemaining: 300, overtime: false, ballHasBeenHit: false },
      { t: 3, gameTimeSeconds: 300, secondsRemaining: 300, overtime: false, ballHasBeenHit: true },
      { t: 31, gameTimeSeconds: 300, secondsRemaining: 272, overtime: false, ballHasBeenHit: false },
      { t: 35, gameTimeSeconds: 300, secondsRemaining: 272, overtime: false, ballHasBeenHit: true },
      { t: 89, gameTimeSeconds: 300, secondsRemaining: 218, overtime: false, ballHasBeenHit: false },
      { t: 93, gameTimeSeconds: 300, secondsRemaining: 218, overtime: false, ballHasBeenHit: true }
    ]
  };
}

function mockStats(goals: number, assists: number, saves: number, shots: number, score: number) {
  return { goals, assists, saves, shots, score, demos: 0 };
}

function carFrame(cx: number, cy: number, t: number, offset: number) {
  const angle = t * 0.7 + offset;
  return {
    position: [cx + Math.cos(angle) * 900, cy + Math.sin(angle * 1.3) * 650, 18] as [number, number, number],
    rotation: [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)] as [number, number, number, number],
    velocity: [-Math.sin(angle) * 500, Math.cos(angle) * 500, 0] as [number, number, number],
    boost: Math.max(0, Math.min(100, 55 + Math.sin(t + offset) * 45)),
    supersonic: Math.sin(t + offset) > 0.8
  };
}
