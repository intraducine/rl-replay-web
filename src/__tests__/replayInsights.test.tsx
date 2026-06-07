import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReplayTimeline } from "../replay/types";
import { MatchMetadataBar } from "../viewer/MatchMetadataBar";
import { formatPlayerRank, PlayerList } from "../viewer/PlayerList";
import { clampSpeed, snapSpeedToStop, TimelineControls } from "../viewer/TimelineControls";
import { livePlayerStatsAt } from "../viewer/playerStats";

const timeline: ReplayTimeline = {
  version: 1,
  metadata: {
    id: "insights",
    fileName: "insights.replay",
    replayName: "Ranked Standard Win",
    mapName: "cs_p",
    date: "2026-01-27 01-10-35",
    durationSeconds: 341.267,
    matchLengthSeconds: 300,
    totalSecondsPlayed: 270.013,
    forfeit: true,
    matchGuid: "F55353A811F0FB45CBFED3A99DA27B6A",
    matchType: "Online",
    teamSize: 3,
    unfairTeamSize: 1,
    serverRegion: "USE",
    playlist: 13,
    createdAt: 0,
    parserVersion: "test",
    players: [
      {
        id: "player-0-Kehvn",
        name: "Kehvn",
        team: 0,
        platform: "OnlinePlatform_Steam",
        stats: { score: 616, goals: 2, assists: 3, saves: 1, shots: 4, demos: 0 },
        cosmetics: { teamPaint: { team: 0, primaryColor: 4, accentColor: 12 } }
      }
    ],
    teams: [
      { id: 0, name: "Blue", score: 5 },
      { id: 1, name: "Orange", score: 3 }
    ]
  },
  events: [
    { type: "goal", t: 117.6, team: 0, scorerId: "player-0-Kehvn" },
    { type: "save", t: 135.1, playerId: "player-0-Kehvn" },
    { type: "demo", t: 155.2, attackerId: "player-0-Kehvn", victimId: "player-1" }
  ],
  frames: []
};

describe("replay insights UI", () => {
  it("renders match context including forfeit and live clock context", () => {
    const { container } = render(<MatchMetadataBar timeline={timeline} />);

    expect(container.textContent).toContain("Ranked Standard Win");
    expect(container.textContent).toContain("Online");
    expect(container.textContent).toContain("3v3");
    expect(container.textContent).toContain("Forfeit");
    expect(container.textContent).toContain("4:30 played");
  });

  it("renders live player stats without misleading score, paint, or static ping", () => {
    const { container } = render(<PlayerList timeline={timeline} />);

    expect(container.textContent).toContain("Kehvn");
    expect(container.textContent).toContain("0 Goals");
    expect(container.textContent).toContain("0 Saves");
    expect(container.textContent).toContain("0 Shots");
    expect(container.textContent).toContain("0 Demos");
    expect(container.textContent).not.toContain("616");
    expect(container.textContent).not.toContain("Paint");
    expect(container.textContent).not.toContain("ping");
    expect(container.textContent).toContain("Rank not saved");
    expect(container.querySelector(".tooltip-bubble")).not.toBeNull();
  });

  it("formats saved rank and MMR when replay data includes them", () => {
    expect(formatPlayerRank({ skillTier: 16, mmr: 1194 })).toEqual({
      label: "Champion I / 1194 MMR",
      tooltip: "Rank and MMR from replay metadata when the replay includes those fields."
    });
    expect(formatPlayerRank({ skillTier: 22 })).toMatchObject({ label: "Supersonic Legend" });
  });

  it("updates player box score from replay events at the current playback time", () => {
    expect(livePlayerStatsAt(timeline, "player-0-Kehvn", 100)).toMatchObject({
      goals: 0,
      saves: 0,
      demos: 0
    });
    expect(livePlayerStatsAt(timeline, "player-0-Kehvn", 160)).toMatchObject({
      goals: 1,
      saves: 1,
      demos: 1
    });
  });

  it("renders typed event markers for goals, saves, and demos", () => {
    const { container } = render(<TimelineControls events={timeline.events} />);

    expect(container.querySelector('.event-track[aria-label="Replay event markers"]')).not.toBeNull();
    expect(container.querySelector(".event-goal")).not.toBeNull();
    expect(container.querySelector(".event-save")).not.toBeNull();
    expect(container.querySelector(".event-demo")).not.toBeNull();
  });

  it("explains the primary desktop play button with a hover tooltip", () => {
    const { container } = render(<TimelineControls events={timeline.events} />);

    const tooltip = container.querySelector(".transport-controls .button-primary .tooltip-bubble");

    expect(tooltip?.textContent).toBe("Play or pause replay");
  });

  it("supports keyboard scrubbing from the timeline controls", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(source).toContain("useTimelineKeyboardShortcuts");
    expect(source).toContain("ArrowLeft");
    expect(source).toContain("ArrowRight");
    expect(source).toContain('event.code === "Space"');
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("Space Play/Pause");
    expect(source).toContain("WASD Move");
    expect(source).toContain("Q/E Down/Up");
    expect(source).toContain("Mouse Drag Orbit");
    expect(source).toContain("TooltipBubble");
  });

  it("uses a bounded speed slider and numeric input instead of a dropdown", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(source).toContain('type="range"');
    expect(source).toContain('type="number"');
    expect(source).toContain("clampSpeed");
    expect(source).toContain("snapSpeedToStop");
    expect(source).toContain('aria-label="Speed stops"');
    expect(source).not.toContain("<Select");
  });

  it("explains the viewer selector controls with hover tooltips", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(source).toContain("Choose how the replay camera follows the match");
    expect(source).toContain("Choose which player the player camera and controls follow");
    expect(source).toContain("Show or hide rendered boost trails");
  });

  it("snaps slider speed to sticky stops while clamping typed values", () => {
    expect(snapSpeedToStop(0.3)).toBe(0.25);
    expect(snapSpeedToStop(0.74)).toBe(0.5);
    expect(snapSpeedToStop(1.6)).toBe(2);
    expect(snapSpeedToStop(3.3)).toBe(4);
    expect(clampSpeed(99)).toBe(4);
    expect(clampSpeed(0)).toBe(0.25);
  });
});
