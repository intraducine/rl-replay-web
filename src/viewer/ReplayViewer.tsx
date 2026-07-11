import { ChevronLeft, ChevronRight, Users, X } from "lucide-react";
import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { samplePlayerBoostsAt, samplePlayerCameraState, timelineDuration } from "../replay/ReplayTimeline";
import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { TooltipBubble } from "../ui/Tooltip";
import { cameraModeOptions, type CameraMode } from "./SpectatorCamera";
import { MatchMetadataBar } from "./MatchMetadataBar";
import { PlayerList } from "./PlayerList";
import { SceneRoot } from "./SceneRoot";
import { Scoreboard } from "./Scoreboard";
import { TimelineControls } from "./TimelineControls";
import { livePlayerStatsByPlayerAt } from "./playerStats";
import { teamClassName } from "./teamColors";

const coordinateDebugOptions = [
  ["swapYZ", "Swap Y/Z", "Swap Rocket League Y and Z axes before rendering"],
  ["invertX", "Flip X", "Flip rendered X positions"],
  ["invertY", "Flip Y", "Flip rendered Y positions"],
  ["invertZ", "Flip Z", "Flip rendered Z positions"],
  ["invertQuatX", "Quat X", "Flip car and ball quaternion X values"],
  ["invertQuatY", "Quat Y", "Flip car and ball quaternion Y values"],
  ["invertQuatZ", "Quat Z", "Flip car and ball quaternion Z values"],
  ["invertQuatW", "Quat W", "Flip car and ball quaternion W values"]
] as const;

export function ReplayViewer({ timeline }: { timeline: ReplayTimeline }) {
  const [rosterOpen, setRosterOpen] = useState(false);
  const {
    setDuration,
    setCurrentTime,
    cameraMode,
    setCameraMode,
    selectedPlayerId,
    setSelectedPlayerId,
    currentTime,
    boostRenderingEnabled,
    setBoostRenderingEnabled,
    setCoordinateOption,
    coordinateOptions
  } = useViewerStore(
    useShallow((state) => ({
      setDuration: state.setDuration,
      setCurrentTime: state.setCurrentTime,
      cameraMode: state.cameraMode,
      setCameraMode: state.setCameraMode,
      selectedPlayerId: state.selectedPlayerId,
      setSelectedPlayerId: state.setSelectedPlayerId,
      currentTime: state.currentTime,
      boostRenderingEnabled: state.boostRenderingEnabled,
      setBoostRenderingEnabled: state.setBoostRenderingEnabled,
      setCoordinateOption: state.setCoordinateOption,
      coordinateOptions: state.coordinateOptions
    }))
  );
  const playerCameraState = cameraMode === "player" ? samplePlayerCameraState(timeline, selectedPlayerId, currentTime) : undefined;
  const showDebugControls = import.meta.env.DEV;
  const { playerOptions, playerIds, playerById, playerNameById } = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const ids: string[] = [];
    const players = new Map(timeline.metadata.players.map((player) => [player.id, player]));
    const names = new Map<string, string>();

    for (const player of timeline.metadata.players) {
      options.push({ value: player.id, label: player.name });
      ids.push(player.id);
      names.set(player.id, player.name);
    }

    return { playerOptions: options, playerIds: ids, playerById: players, playerNameById: names };
  }, [timeline.metadata.players]);
  const cameraLabel = cameraModeOptions.find((option) => option.value === cameraMode)?.label ?? cameraMode;
  const selectedPlayerName = selectedPlayerId ? playerNameById.get(selectedPlayerId) : undefined;
  const selectedPlayer = selectedPlayerId ? playerById.get(selectedPlayerId) : undefined;
  const boostByPlayer = samplePlayerBoostsAt(timeline, playerIds, currentTime);
  const statsByPlayer = livePlayerStatsByPlayerAt(timeline, currentTime);
  const selectedStats = selectedPlayerId ? statsByPlayer[selectedPlayerId] : undefined;
  const selectedBoost = selectedPlayerId ? boostByPlayer[selectedPlayerId] : undefined;
  const selectedBoostValue = Math.max(0, Math.min(100, selectedBoost ?? 0));

  useEffect(() => {
    setDuration(timelineDuration(timeline));
    setCurrentTime(0);
    const currentSelectedPlayerId = useViewerStore.getState().selectedPlayerId;
    if (
      timeline.metadata.players[0] &&
      (!currentSelectedPlayerId || !timeline.metadata.players.some((player) => player.id === currentSelectedPlayerId))
    ) {
      setSelectedPlayerId(timeline.metadata.players[0].id);
    }
  }, [timeline, setCurrentTime, setDuration, setSelectedPlayerId]);

  return (
    <main className="viewer" aria-label={`Replay viewer: ${timeline.metadata.replayName ?? timeline.metadata.fileName}`}>
      <SceneRoot timeline={timeline} />

      <div className="broadcast-scoreboard">
        <Scoreboard timeline={timeline} />
      </div>

      <div className="camera-dock" aria-label="Camera and rendering controls">
        <label className="camera-segment tooltip-target">
          <span className="sr-only">Camera mode</span>
          <select
            value={cameraMode}
            aria-label="Camera mode"
            onChange={(event) => setCameraMode(event.currentTarget.value as CameraMode)}
          >
            {cameraModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <TooltipBubble>Choose how the replay camera follows the match</TooltipBubble>
        </label>
        <label className="camera-segment player tooltip-target">
          <span className="sr-only">Follow player</span>
          <select
            value={selectedPlayerId ?? ""}
            aria-label="Follow player"
            onChange={(event) => {
              setSelectedPlayerId(event.currentTarget.value);
              setCameraMode("player");
            }}
          >
            {playerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <TooltipBubble>Choose which player the player camera and controls follow</TooltipBubble>
        </label>
        <label className="camera-segment boost tooltip-target">
          <input
            type="checkbox"
            aria-label="Toggle boost rendering"
            checked={boostRenderingEnabled}
            onChange={(event) => setBoostRenderingEnabled(event.currentTarget.checked)}
          />
          <span>Boost</span>
          <TooltipBubble>Show or hide rendered boost trails</TooltipBubble>
        </label>
      </div>

      <button
        type="button"
        className="roster-tab tooltip-target"
        aria-label={rosterOpen ? "Close player roster" : "Open player roster"}
        aria-expanded={rosterOpen}
        onClick={() => setRosterOpen((open) => !open)}
      >
        <Users size={18} />
        {rosterOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        <TooltipBubble>{rosterOpen ? "Close player roster" : "Open player roster"}</TooltipBubble>
      </button>

      <aside className={`roster-drawer ${rosterOpen ? "open" : ""}`} aria-label="Replay roster" aria-hidden={!rosterOpen} inert={!rosterOpen}>
        <div className="roster-heading">
          <div>
            <span>Match roster</span>
            <strong>{timeline.metadata.players.length} players</strong>
          </div>
          <button type="button" aria-label="Close player roster" onClick={() => setRosterOpen(false)}><X size={18} /></button>
        </div>
        <MatchMetadataBar timeline={timeline} />
        <PlayerList timeline={timeline} boostByPlayer={boostByPlayer} statsByPlayer={statsByPlayer} />
      </aside>

      {selectedPlayer ? (
        <section className={`selected-player-hud ${teamClassName(selectedPlayer.team)}`} aria-label={`Following ${selectedPlayer.name}`}>
          <div className="selected-player-copy">
            <span>Following</span>
            <strong>{selectedPlayer.name}</strong>
            <div className="selected-player-stats" aria-label="Player statistics">
              <span>G <b>{selectedStats?.goals ?? 0}</b></span>
              <span>SV <b>{selectedStats?.saves ?? 0}</b></span>
              <span>SH <b>{selectedStats?.shots ?? 0}</b></span>
              <span>D <b>{selectedStats?.demos ?? 0}</b></span>
            </div>
          </div>
          <div className="selected-player-boost" aria-label={`${Math.round(selectedBoost ?? 0)} percent boost`}>
            <CircularProgressbar value={selectedBoostValue} text={`${Math.round(selectedBoostValue)}`} strokeWidth={10} />
            <span>Boost</span>
          </div>
        </section>
      ) : null}

      {cameraMode === "player" && playerCameraState?.usingSecondaryCamera ? (
        <div className="ball-cam-warning" role="status" aria-live="polite">
          <strong>Ball cam</strong>
          <span>Camera locked to ball</span>
        </div>
      ) : null}

      {showDebugControls ? (
        <div className="viewer-overlay debug">
          <details>
            <summary className="tooltip-target">
              Coordinates
              <TooltipBubble>Coordinate transform debugging options</TooltipBubble>
            </summary>
            {coordinateDebugOptions.map(([key, label, tooltip]) => (
              <label key={key} className="tooltip-target">
                <input
                  type="checkbox"
                  checked={Boolean(coordinateOptions[key as keyof typeof coordinateOptions])}
                  onChange={(event) => setCoordinateOption(key as keyof typeof coordinateOptions, event.currentTarget.checked)}
                />
                {label}
                <TooltipBubble>{tooltip}</TooltipBubble>
              </label>
            ))}
          </details>
        </div>
      ) : null}

      <div className="viewer-overlay bottom">
        <TimelineControls events={timeline.events} status={{ cameraLabel, playerName: selectedPlayerName, boostRenderingEnabled }} />
      </div>
    </main>
  );
}
