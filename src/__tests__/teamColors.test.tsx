import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReplayTimeline } from "../replay/types";
import { Scoreboard } from "../viewer/Scoreboard";
import { rocketLeaguePaintColor, teamById, teamCarPaint, teamClassName } from "../viewer/teamColors";

const timeline: ReplayTimeline = {
  version: 1,
  metadata: {
    id: "test",
    fileName: "test.replay",
    durationSeconds: 1,
    createdAt: 0,
    parserVersion: "test",
    players: [],
    teams: [
      { id: 1, name: "Orange", score: 8 },
      { id: 0, name: "Blue", score: 5 }
    ]
  },
  events: [],
  frames: []
};

describe("team colors", () => {
  it("maps Rocket League team ids to the app colors", () => {
    expect(teamClassName(0)).toBe("blue");
    expect(teamClassName(1)).toBe("orange");
    expect(teamCarPaint(0)).toBe("#1976ff");
    expect(teamCarPaint(1)).toBe("#ff6b1f");
  });

  it("looks up teams by id instead of metadata array order", () => {
    expect(teamById(timeline.metadata.teams, 0).score).toBe(5);
    expect(teamById(timeline.metadata.teams, 1).score).toBe(8);
  });

  it("keeps Rocket League paint indices in their team hue family", () => {
    expect(rocketLeaguePaintColor(16, 0, "#fallback")).toBe("#0f4bd9");
    expect(rocketLeaguePaintColor(16, 1, "#fallback")).toBe("#f5c84a");
    expect(rocketLeaguePaintColor(90, 0, "#fallback")).toBe("#1686ff");
    expect(rocketLeaguePaintColor(90, 1, "#fallback")).toBe("#e94a21");
  });

  it("uses the team fallback when a replay has no primary paint index", () => {
    expect(rocketLeaguePaintColor(undefined, 0, "#fallback")).toBe("#fallback");
    expect(rocketLeaguePaintColor(undefined, 1, "#fallback")).toBe("#fallback");
  });

  it("renders scoreboard color slots by team id", () => {
    const { container } = render(<Scoreboard timeline={timeline} />);
    expect(container.querySelector(".scoreboard .blue")).not.toBeNull();
    expect(container.querySelector(".scoreboard .orange")).not.toBeNull();
  });
});
