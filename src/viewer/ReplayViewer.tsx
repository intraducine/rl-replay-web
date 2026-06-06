import { useEffect } from "react";
import { samplePlayerCameraState, sampleTimeline, timelineDuration } from "../replay/ReplayTimeline";
import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { Select } from "../ui/Select";
import { cameraModeOptions, type CameraMode } from "./SpectatorCamera";
import { MatchMetadataBar } from "./MatchMetadataBar";
import { PlayerList } from "./PlayerList";
import { SceneRoot } from "./SceneRoot";
import { Scoreboard } from "./Scoreboard";
import { TimelineControls } from "./TimelineControls";

export function ReplayViewer({ timeline }: { timeline: ReplayTimeline }) {
  const setDuration = useViewerStore((state) => state.setDuration);
  const setCurrentTime = useViewerStore((state) => state.setCurrentTime);
  const cameraMode = useViewerStore((state) => state.cameraMode);
  const setCameraMode = useViewerStore((state) => state.setCameraMode);
  const selectedPlayerId = useViewerStore((state) => state.selectedPlayerId);
  const setSelectedPlayerId = useViewerStore((state) => state.setSelectedPlayerId);
  const currentTime = useViewerStore((state) => state.currentTime);
  const boostRenderingEnabled = useViewerStore((state) => state.boostRenderingEnabled);
  const setBoostRenderingEnabled = useViewerStore((state) => state.setBoostRenderingEnabled);
  const setCoordinateOption = useViewerStore((state) => state.setCoordinateOption);
  const coordinateOptions = useViewerStore((state) => state.coordinateOptions);
  const sample = sampleTimeline(timeline, currentTime);
  const playerCameraState = samplePlayerCameraState(timeline, selectedPlayerId, currentTime);
  const showDebugControls = import.meta.env.DEV;
  const boostByPlayer = Object.fromEntries(
    timeline.metadata.players.map((player) => [player.id, sample.cars[player.id]?.boost])
  );

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
        </div>
        <div className="viewer-control-panel">
          {cameraMode === "player" && playerCameraState?.usingSecondaryCamera ? <div className="ball-cam-indicator">BALL CAM</div> : null}
          <div className="viewer-selectors">
            <Select
              label="Camera"
              value={cameraMode}
              options={cameraModeOptions}
              onChange={(event) => setCameraMode(event.currentTarget.value as CameraMode)}
            />
            <Select
              label="Player"
              value={selectedPlayerId ?? ""}
              options={timeline.metadata.players.map((player) => ({ value: player.id, label: player.name }))}
              onChange={(event) => setSelectedPlayerId(event.currentTarget.value)}
            />
            <label className="viewer-toggle">
              <input
                type="checkbox"
                aria-label="Toggle boost rendering"
                checked={boostRenderingEnabled}
                onChange={(event) => setBoostRenderingEnabled(event.currentTarget.checked)}
              />
              Boost
            </label>
          </div>
        </div>
      </div>
      <div className="viewer-overlay side">
        <PlayerList timeline={timeline} boostByPlayer={boostByPlayer} />
      </div>
      {showDebugControls ? (
        <div className="viewer-overlay debug">
          <details>
            <summary>Coordinates</summary>
            {[
              ["swapYZ", "Swap Y/Z"],
              ["invertX", "Flip X"],
              ["invertY", "Flip Y"],
              ["invertZ", "Flip Z"],
              ["invertQuatX", "Quat X"],
              ["invertQuatY", "Quat Y"],
              ["invertQuatZ", "Quat Z"],
              ["invertQuatW", "Quat W"]
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(coordinateOptions[key as keyof typeof coordinateOptions])}
                  onChange={(event) => setCoordinateOption(key as keyof typeof coordinateOptions, event.currentTarget.checked)}
                />
                {label}
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
