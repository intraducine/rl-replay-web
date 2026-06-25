import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { samplePlayerBoostsAt, samplePlayerCameraState, timelineDuration } from "../replay/ReplayTimeline";
import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { Select } from "../ui/Select";
import { TooltipBubble } from "../ui/Tooltip";
import { cameraModeOptions, type CameraMode } from "./SpectatorCamera";
import { MatchMetadataBar } from "./MatchMetadataBar";
import { PlayerList } from "./PlayerList";
import { SceneRoot } from "./SceneRoot";
import { Scoreboard } from "./Scoreboard";
import { TimelineControls } from "./TimelineControls";
import { livePlayerStatsByPlayerAt } from "./playerStats";

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
  const playerOptions = useMemo(() => timeline.metadata.players.map((player) => ({ value: player.id, label: player.name })), [timeline]);
  const playerIds = useMemo(() => timeline.metadata.players.map((player) => player.id), [timeline]);
  const boostByPlayer = samplePlayerBoostsAt(timeline, playerIds, currentTime);
  const statsByPlayer = livePlayerStatsByPlayerAt(timeline, currentTime);

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
    <div className="viewer">
      <SceneRoot timeline={timeline} />
      <div className="viewer-overlay top">
        <div className="viewer-top-left">
          <Scoreboard timeline={timeline} />
          <MatchMetadataBar timeline={timeline} />
          <PlayerList timeline={timeline} boostByPlayer={boostByPlayer} statsByPlayer={statsByPlayer} />
        </div>
        <div className="viewer-control-panel">
          {cameraMode === "player" && playerCameraState?.usingSecondaryCamera ? <div className="ball-cam-indicator">BALL CAM</div> : null}
          <div className="viewer-selectors">
            <Select
              label="Camera"
              value={cameraMode}
              options={cameraModeOptions}
              tooltip="Choose how the replay camera follows the match"
              onChange={(event) => setCameraMode(event.currentTarget.value as CameraMode)}
            />
            <Select
              label="Player"
              value={selectedPlayerId ?? ""}
              options={playerOptions}
              tooltip="Choose which player the player camera and controls follow"
              onChange={(event) => setSelectedPlayerId(event.currentTarget.value)}
            />
            <label className="viewer-toggle tooltip-target">
              <input
                type="checkbox"
                aria-label="Toggle boost rendering"
                checked={boostRenderingEnabled}
                onChange={(event) => setBoostRenderingEnabled(event.currentTarget.checked)}
              />
              Boost
              <TooltipBubble>Show or hide rendered boost trails</TooltipBubble>
            </label>
          </div>
        </div>
      </div>
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
        <TimelineControls events={timeline.events} />
      </div>
    </div>
  );
}
