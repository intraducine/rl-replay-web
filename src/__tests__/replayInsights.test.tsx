import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReplayTimeline } from "../replay/types";
import { MatchMetadataBar } from "../viewer/MatchMetadataBar";
import { PlayerList } from "../viewer/PlayerList";
import { TimelineControls } from "../viewer/TimelineControls";

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

  it("renders player box score and cosmetic/platform context", () => {
    const { container } = render(<PlayerList timeline={timeline} />);

    expect(container.textContent).toContain("Kehvn");
    expect(container.textContent).toContain("616");
    expect(container.textContent).toContain("2G");
    expect(container.textContent).toContain("3A");
    expect(container.textContent).toContain("1S");
    expect(container.textContent).toContain("Steam");
  });

  it("renders typed event markers for goals, saves, and demos", () => {
    const { container } = render(<TimelineControls events={timeline.events} />);

    expect(container.querySelector(".event-goal")).not.toBeNull();
    expect(container.querySelector(".event-save")).not.toBeNull();
    expect(container.querySelector(".event-demo")).not.toBeNull();
  });
});
