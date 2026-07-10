import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReplayTimeline } from "../replay/types";
import { MatchMetadataBar } from "../viewer/MatchMetadataBar";
import { formatPlayerRank, PlayerList } from "../viewer/PlayerList";
import { clampSpeed, snapSpeedToStop, TimelineControls } from "../viewer/TimelineControls";
import { emptyLivePlayerStats, livePlayerStatsAt, livePlayerStatsByPlayerAt } from "../viewer/playerStats";

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

  it("explains compact match metadata pills with hover tooltips", () => {
    const { container } = render(<MatchMetadataBar timeline={timeline} />);

    const tooltipTexts = [...container.querySelectorAll(".match-metadata-bar .tooltip-bubble")].map((node) => node.textContent);

    expect(tooltipTexts).toEqual([
      "Replay name",
      "Match type",
      "Team size",
      "Rocket League playlist id",
      "Server region",
      "Match ended by forfeit",
      "In-game time played",
      "Replay save date"
    ]);
  });

  it("renders live player stats without misleading score, paint, or static ping", () => {
    const { container } = render(<PlayerList timeline={timeline} />);

    expect(container.textContent).toContain("Kehvn");
    expect(container.textContent).toContain("0 G");
    expect(container.textContent).toContain("0 Sv");
    expect(container.textContent).toContain("0 Sh");
    expect(container.textContent).toContain("0 D");
    expect(container.textContent).not.toContain("616");
    expect(container.textContent).not.toContain("Paint");
    expect(container.textContent).not.toContain("ping");
    expect(container.textContent).not.toContain("Rank not saved");
    expect(container.querySelector('[aria-label="0 goals"]')).not.toBeNull();
    expect(container.querySelector(".tooltip-bubble")).not.toBeNull();
  });

  it("formats saved rank and Elo when replay data includes them", () => {
    expect(formatPlayerRank({ skillTier: 16, mmr: 1194 })).toEqual({
      label: "Champion I / 1194 Elo",
      tooltip: "Rank and Elo/MMR from replay metadata when the replay includes those fields."
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
    expect(livePlayerStatsByPlayerAt(timeline, 160)["player-0-Kehvn"]).toMatchObject({
      goals: 1,
      saves: 1,
      demos: 1
    });
  });

  it("reuses the empty live stats fallback without sharing mutable scored stats", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/playerStats.ts"), "utf8");
    const firstEmpty = emptyLivePlayerStats();
    const secondEmpty = emptyLivePlayerStats();
    const scoredStats = livePlayerStatsByPlayerAt(timeline, 160)["player-0-Kehvn"];

    expect(firstEmpty).toBe(secondEmpty);
    expect(scoredStats).not.toBe(firstEmpty);
    expect(scoredStats).toMatchObject({ goals: 1, saves: 1, demos: 1 });
    expect(source).toContain("const EMPTY_LIVE_PLAYER_STATS");
    expect(source).toContain("const EMPTY_LIVE_PLAYER_STATS_BY_PLAYER");
    expect(source).toContain("return EMPTY_LIVE_PLAYER_STATS");
    expect(source).toContain("statsByPlayer[playerId] = { ...(statsByPlayer[playerId] ?? EMPTY_LIVE_PLAYER_STATS) }");
  });

  it("caches cumulative player stat snapshots before binary lookup during playback", () => {
    const unsortedTimeline: ReplayTimeline = {
      ...timeline,
      events: [
        { type: "save", t: 135.1, playerId: "player-0-Kehvn" },
        { type: "goal", t: 117.6, team: 0, scorerId: "player-0-Kehvn" },
        { type: "demo", t: 155.2, attackerId: "player-0-Kehvn", victimId: "player-1" }
      ]
    };
    const source = readFileSync(resolve(process.cwd(), "src/viewer/playerStats.ts"), "utf8");

    expect(livePlayerStatsByPlayerAt(unsortedTimeline, 120)["player-0-Kehvn"]).toMatchObject({
      goals: 1,
      saves: 0,
      demos: 0
    });
    expect(source).toContain("statIndexCache");
    expect(source).toContain("function statIndexForTimeline");
    expect(source).toContain("snapshots[mid].t <= timeSeconds");
    expect(source).toContain("return snapshots[low - 1]?.statsByPlayer");
    expect(source).toContain("statsByPlayer = { ...statsByPlayer }");
    expect(source).not.toContain("function cloneStatsByPlayer");
    expect(source).not.toContain("Object.entries(statsByPlayer)");
    expect(source).toContain("statEventsForTimeline(timeline)");
    expect(source).toContain("events.sort((a, b) => a.t - b.t)");
    expect(source).not.toContain("if (event.t > timeSeconds) break");
  });

  it("computes live player stats once in ReplayViewer before rendering the player list", () => {
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");
    const playerListSource = readFileSync(resolve(process.cwd(), "src/viewer/PlayerList.tsx"), "utf8");

    expect(replayViewerSource).toContain("livePlayerStatsByPlayerAt(timeline, currentTime)");
    expect(replayViewerSource).toContain("statsByPlayer={statsByPlayer}");
    expect(playerListSource).not.toContain("livePlayerStatsAt(");
    expect(playerListSource).not.toContain("state.currentTime");
  });

  it("subscribes player list only to selected-player state", () => {
    const playerListSource = readFileSync(resolve(process.cwd(), "src/viewer/PlayerList.tsx"), "utf8");

    expect(playerListSource).toContain('import { useShallow } from "zustand/shallow"');
    expect(playerListSource).toContain("useViewerStore(\n    useShallow((state) => ({");
    expect(playerListSource).toContain("selectedPlayerId: state.selectedPlayerId");
    expect(playerListSource).toContain("setSelectedPlayerId: state.setSelectedPlayerId");
    expect(playerListSource).not.toContain("const selectedPlayerId = useViewerStore((state) => state.selectedPlayerId)");
    expect(playerListSource).not.toContain("const setSelectedPlayerId = useViewerStore((state) => state.setSelectedPlayerId)");
  });

  it("avoids extra player data allocation work in the replay viewer render path", () => {
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(replayViewerSource).toContain('const playerCameraState = cameraMode === "player" ? samplePlayerCameraState(timeline, selectedPlayerId, currentTime) : undefined');
    expect(replayViewerSource).toContain("const { playerOptions, playerIds, playerById, playerNameById } = useMemo(");
    expect(replayViewerSource).toContain("for (const player of timeline.metadata.players)");
    expect(replayViewerSource).toContain("ids.push(player.id)");
    expect(replayViewerSource).toContain("names.set(player.id, player.name)");
    expect(replayViewerSource).toContain("samplePlayerBoostsAt(timeline");
    expect(replayViewerSource).toContain("new Map(timeline.metadata.players.map");
    expect(replayViewerSource).not.toContain("sampleTimeline(timeline, currentTime)");
    expect(replayViewerSource).not.toContain("boostByPlayerFromSample");
    expect(replayViewerSource).not.toContain("Object.fromEntries");
    expect(replayViewerSource).not.toContain("options={timeline.metadata.players.map");
  });

  it("builds synthetic actor players without chained key/filter/map allocations", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    const completePlayersSource = sceneRootSource.match(/function completePlayers[\s\S]*?\n}\n$/)?.[0] ?? "";

    expect(completePlayersSource).toContain("for (const player of players)");
    expect(completePlayersSource).toContain("for (const id in sample.cars)");
    expect(completePlayersSource).toContain("Object.prototype.hasOwnProperty.call(sample.cars, id)");
    expect(completePlayersSource).toContain("if (!actors) return players");
    expect(completePlayersSource).not.toContain("players.map((player) => player.id)");
    expect(completePlayersSource).not.toContain("Object.keys(sample.cars)");
    expect(completePlayersSource).not.toContain(".filter((id)");
    expect(completePlayersSource).not.toContain(".map((id, index)");
    expect(completePlayersSource).not.toContain("return [...players, ...actors]");
  });

  it("uses one shallow viewer store selector for replay chrome state", () => {
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(replayViewerSource).toContain('import { useShallow } from "zustand/shallow"');
    expect(replayViewerSource).toContain("} = useViewerStore(\n    useShallow((state) => ({");
    expect(replayViewerSource).toContain("currentTime: state.currentTime");
    expect(replayViewerSource).toContain("cameraMode: state.cameraMode");
    expect(replayViewerSource).toContain("boostRenderingEnabled: state.boostRenderingEnabled");
    expect(replayViewerSource).not.toContain("const currentTime = useViewerStore((state) => state.currentTime)");
    expect(replayViewerSource).not.toContain("const cameraMode = useViewerStore((state) => state.cameraMode)");
  });

  it("renders typed event markers for goals, saves, and demos", () => {
    const { container } = render(<TimelineControls events={timeline.events} />);

    expect(container.querySelector('.event-track[aria-label="Replay event markers"]')).not.toBeNull();
    expect(container.querySelector(".event-goal")).not.toBeNull();
    expect(container.querySelector(".event-save")).not.toBeNull();
    expect(container.querySelector(".event-demo")).not.toBeNull();
    expect(container.querySelector(".event-track .event-goal .tooltip-bubble")?.textContent).toBe("goal · 1:57");
    expect(container.querySelector(".event-track .event-goal")?.getAttribute("aria-label")).toContain("Jump to goal at 1:57");
  });

  it("memoizes timeline event markers so playback progress updates less marker work", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(source).toContain("const eventMarkers = useMemo(() => replayEventMarkers(events, duration), [events, duration])");
    expect(source).toContain("function replayEventMarkers");
    expect(source).toContain("eventMarkers.map((event)");
    expect(source).not.toContain("{events.map((event, index) => (");
  });

  it("subscribes timeline controls only to playback fields", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(source).toContain('import { useShallow } from "zustand/shallow"');
    expect(source).toContain("useViewerStore(\n    useShallow((state) => ({");
    expect(source).toContain("playing: state.playing");
    expect(source).toContain("currentTime: state.currentTime");
    expect(source).toContain("duration: state.duration");
    expect(source).toContain("speed: state.speed");
    expect(source).not.toContain("useViewerStore();");
  });

  it("explains the primary desktop play button with a hover tooltip", () => {
    const { container } = render(<TimelineControls events={timeline.events} />);

    const tooltip = container.querySelector(".transport-controls .button-primary .tooltip-bubble");

    expect(tooltip?.textContent).toBe("Play or pause replay");
  });

  it("supports keyboard scrubbing from the timeline controls", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");
    const shortcutSource = source.match(/export function useTimelineKeyboardShortcuts[\s\S]*?\n}\n\nfunction isEditableEventTarget/)?.[0] ?? "";

    expect(source).toContain("useTimelineKeyboardShortcuts");
    expect(source).toContain("ArrowLeft");
    expect(source).toContain("ArrowRight");
    expect(source).toContain('event.code === "Space"');
    expect(source).toContain("event.preventDefault()");
    expect(shortcutSource).toContain("const state = useViewerStore.getState()");
    expect(shortcutSource).toContain("state.seekBy(event.shiftKey ? -1 : -5)");
    expect(shortcutSource).toContain("state.setCurrentTime(0)");
    expect(shortcutSource).toContain("state.setPlaying(!state.playing)");
    expect(shortcutSource).not.toContain("useViewerStore((state) => state.seekBy)");
    expect(shortcutSource).not.toContain("useViewerStore((state) => state.setCurrentTime)");
    expect(shortcutSource).not.toContain("useViewerStore((state) => state.setPlaying)");
    expect(source).toContain("<kbd>Space</kbd> Play/Pause");
    expect(source).toContain("<kbd>WASD</kbd> Move");
    expect(source).toContain("<kbd>Q/E</kbd> Down/Up");
    expect(source).toContain("<kbd>Mouse drag</kbd> Orbit");
    expect(source).toContain("TooltipBubble");
  });

  it("uses a bounded speed menu that matches the broadcast replay rail", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(source).toContain('type="range"');
    expect(source).toContain('<select value={speed} aria-label="Playback speed"');
    expect(source).toContain("clampSpeed");
    expect(source).toContain("snapSpeedToStop");
    expect(source).toContain("SPEED_STOPS.map");
  });

  it("explains the playback speed menu with a hover tooltip", () => {
    const { container } = render(<TimelineControls events={timeline.events} />);

    expect(container.querySelector(".speed-select .tooltip-bubble")?.textContent).toBe("Playback speed");
    expect(container.querySelectorAll('.speed-select option')).toHaveLength(5);
  });

  it("explains the viewer selector controls with hover tooltips", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(source).toContain("Choose how the replay camera follows the match");
    expect(source).toContain("Choose which player the player camera and controls follow");
    expect(source).toContain("Show or hide rendered boost trails");
  });

  it("explains development coordinate toggles with hover tooltips", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(source).toContain("Coordinate transform debugging options");
    expect(source).toContain("Swap Rocket League Y and Z axes before rendering");
    expect(source).toContain("Flip rendered X positions");
    expect(source).toContain("Flip car and ball quaternion W values");
    expect(source).toContain('className="tooltip-target"');
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
