import { FastForward, Pause, Play, Rewind, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReplayEvent } from "../replay/types";
import { useShallow } from "zustand/shallow";
import { useViewerStore } from "../state/viewerStore";
import { Button } from "../ui/Button";
import { stepFrame } from "./PlaybackController";

const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const SPEED_STOPS = [0.25, 0.5, 1, 2, 4];

export type TimelineStatus = {
  cameraLabel: string;
  playerName?: string;
  boostRenderingEnabled: boolean;
  freeCameraAvailable?: boolean;
};

export function TimelineControls({
  events = [],
  playerNameById = new Map(),
  status
}: {
  events?: ReplayEvent[];
  playerNameById?: ReadonlyMap<string, string>;
  status?: TimelineStatus;
}) {
  const { playing, currentTime, duration, speed, setPlaying, setCurrentTime, setSpeed, seekBy } = useViewerStore(
    useShallow((state) => ({
      playing: state.playing,
      currentTime: state.currentTime,
      duration: state.duration,
      speed: state.speed,
      setPlaying: state.setPlaying,
      setCurrentTime: state.setCurrentTime,
      setSpeed: state.setSpeed,
      seekBy: state.seekBy
    }))
  );
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = Math.max(0, duration - currentTime);
  const eventMarkers = useMemo(() => replayEventMarkers(events, duration, playerNameById), [events, duration, playerNameById]);
  const [hoveredEventKey, setHoveredEventKey] = useState<string>();
  const [activeEventKey, setActiveEventKey] = useState<string>();
  const eventButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const hoveredEvent = eventMarkers.find((event) => event.key === hoveredEventKey);
  useTimelineKeyboardShortcuts();

  useEffect(() => {
    if (!eventMarkers.some((event) => event.key === activeEventKey)) setActiveEventKey(eventMarkers[0]?.key);
  }, [activeEventKey, eventMarkers]);

  const focusEventAt = (index: number) => {
    const event = eventMarkers[Math.max(0, Math.min(eventMarkers.length - 1, index))];
    if (!event) return;
    setActiveEventKey(event.key);
    setHoveredEventKey(event.key);
    eventButtonRefs.current.get(event.key)?.focus();
  };

  return (
    <div className="timeline-controls" aria-label="Replay playback controls">
      <div className="timeline-line">
        <span className="timeline-time" aria-label={`${formatTime(currentTime)} of ${formatTime(duration)}`}>
          <strong>{formatTime(currentTime)}</strong><span>/ {formatTime(duration)}</span>
        </span>
        <div className="timeline-scrubber">
          <label>
            <span className="sr-only">Replay timeline</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={0.01}
              value={currentTime}
              aria-label="Timeline"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              onChange={(event) => setCurrentTime(Number(event.currentTarget.value))}
            />
          </label>
          <div
            className={`event-track${hoveredEvent ? " has-hover" : ""}`}
            aria-label="Replay event markers. Use left and right arrow keys to move between events."
            onMouseLeave={() => setHoveredEventKey(undefined)}
          >
            <span className="event-track-progress" style={{ width: `${percent}%` }} />
            {eventMarkers.map((event) => (
              <button
                type="button"
                key={event.key}
                className={`event-marker event-${event.type} event-edge-${event.edge}`}
                style={{ left: event.left }}
                aria-label={`Jump to ${event.details} at ${formatTime(event.t)}`}
                tabIndex={activeEventKey === event.key ? 0 : -1}
                ref={(button) => {
                  if (button) eventButtonRefs.current.set(event.key, button);
                  else eventButtonRefs.current.delete(event.key);
                }}
                onMouseEnter={() => setHoveredEventKey(event.key)}
                onFocus={() => {
                  setActiveEventKey(event.key);
                  setHoveredEventKey(event.key);
                }}
                onKeyDown={(keyEvent) => {
                  const index = eventMarkers.findIndex((marker) => marker.key === event.key);
                  if (keyEvent.key === "ArrowLeft" || keyEvent.key === "ArrowUp") {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                    focusEventAt(index - 1);
                  } else if (keyEvent.key === "ArrowRight" || keyEvent.key === "ArrowDown") {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                    focusEventAt(index + 1);
                  } else if (keyEvent.key === "Home") {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                    focusEventAt(0);
                  } else if (keyEvent.key === "End") {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                    focusEventAt(eventMarkers.length - 1);
                  }
                }}
                onBlur={(focusEvent) => {
                  if (!focusEvent.currentTarget.parentElement?.contains(focusEvent.relatedTarget as Node | null)) {
                    setHoveredEventKey(undefined);
                  }
                }}
                onClick={() => {
                  setActiveEventKey(event.key);
                  setCurrentTime(event.t);
                }}
              >
                <span className="event-marker-tooltip" aria-hidden="true">
                  <strong>{event.typeLabel}</strong>
                </span>
              </button>
            ))}
            {hoveredEvent ? (
              <span
                className={`event-hover-card event-hover-${hoveredEvent.type} event-edge-${hoveredEvent.edge}`}
                style={{ left: hoveredEvent.left }}
                role="tooltip"
                aria-hidden="true"
              >
                <strong>{hoveredEvent.typeLabel}</strong>
                <span>{hoveredEvent.playerLabel}</span>
              </span>
            ) : null}
          </div>
        </div>
        <span className="timeline-remaining"><b>{formatTime(remainingTime)}</b> left</span>
      </div>

      <div className="control-row">
        <span className="playback-state" aria-live="polite">{playing ? "Playing" : "Paused"}</span>
        <div className="transport-controls">
          <Button className="transport-skip" icon={<SkipBack size={20} />} onClick={() => setCurrentTime(0)} aria-label="Go to replay start" />
          <Button className="transport-seek" onClick={() => seekBy(-5)} aria-label="Jump backward 5 seconds"><span className="seek-value">−5s</span></Button>
          <Button className="transport-frame" icon={<Rewind size={20} />} onClick={() => setCurrentTime(stepFrame(currentTime, -1, duration))} aria-label="Previous frame" />
          <Button
            variant="primary"
            className="transport-play"
            icon={playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause replay" : "Play replay"}
          />
          <Button className="transport-frame" icon={<FastForward size={20} />} onClick={() => setCurrentTime(stepFrame(currentTime, 1, duration))} aria-label="Next frame" />
          <Button className="transport-seek" onClick={() => seekBy(5)} aria-label="Jump forward 5 seconds"><span className="seek-value">+5s</span></Button>
          <Button className="transport-skip" icon={<SkipForward size={20} />} onClick={() => setCurrentTime(duration)} aria-label="Go to replay end" />
        </div>
        <label className="speed-select">
          <span className="sr-only">Speed</span>
          <span className="speed-value" aria-hidden="true">{formatSpeed(speed)}×</span>
          <select value={speed} aria-label="Playback speed" onChange={(event) => setSpeed(clampSpeed(Number(event.currentTarget.value)))}>
            {SPEED_STOPS.map((value) => <option key={value} value={value}>{formatSpeed(value)}×</option>)}
          </select>
        </label>
      </div>

      <div className="mobile-transport-controls" aria-label="Mobile playback controls">
        <Button icon={<SkipBack size={16} />} onClick={() => setCurrentTime(0)} aria-label="Go to replay start" />
        <Button onClick={() => seekBy(-5)}>−5s</Button>
        <Button variant="primary" icon={playing ? <Pause size={18} /> : <Play size={18} />} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause replay" : "Play replay"} />
        <Button onClick={() => seekBy(5)}>+5s</Button>
        <Button icon={<SkipForward size={16} />} onClick={() => setCurrentTime(duration)} aria-label="Go to replay end" />
      </div>

      <div className="sr-only" aria-label="Replay playback status">
        {status ? `${status.cameraLabel} camera. ${status.playerName ?? "No player selected"}. Boost rendering ${status.boostRenderingEnabled ? "on" : "off"}.` : null}
        <kbd>Space</kbd> Play/Pause.
        {status?.freeCameraAvailable ? <><kbd>WASD</kbd> Move. <kbd>Q/E</kbd> Down/Up. <kbd>Mouse drag</kbd> Look.</> : null}
      </div>
    </div>
  );
}

export function useTimelineKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) return;
      const state = useViewerStore.getState();
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        state.seekBy(event.shiftKey ? -1 : -5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        state.seekBy(event.shiftKey ? 1 : 5);
      } else if (event.key === "Home") {
        event.preventDefault();
        state.setCurrentTime(0);
      } else if (event.code === "Space") {
        event.preventDefault();
        state.setPlaying(!state.playing);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function eventTypeLabel(event: ReplayEvent): string {
  return event.type === "demo" ? "Demo" : `${event.type[0].toUpperCase()}${event.type.slice(1)}`;
}

function eventPlayerLabel(event: ReplayEvent, playerNameById: ReadonlyMap<string, string>): string {
  const playerName = (id?: string) => (id ? playerNameById.get(id) ?? "Unknown player" : "Unknown player");
  if (event.type === "goal") return playerName(event.scorerId);
  if (event.type === "shot" || event.type === "save") return playerName(event.playerId);
  if (event.attackerId && event.victimId) return `${playerName(event.attackerId)} demolished ${playerName(event.victimId)}`;
  if (event.attackerId) return playerName(event.attackerId);
  if (event.victimId) return `${playerName(event.victimId)} was demolished`;
  return "Players unknown";
}

function replayEventMarkers(events: ReplayEvent[], duration: number, playerNameById: ReadonlyMap<string, string>) {
  const safeDuration = Math.max(duration, 1);
  return events.map((event, index) => {
    const position = (event.t / safeDuration) * 100;
    const typeLabel = eventTypeLabel(event);
    const playerLabel = eventPlayerLabel(event, playerNameById);
    return {
      key: `${event.type}-${event.t}-${index}`,
      type: event.type,
      typeLabel,
      playerLabel,
      details: `${typeLabel} — ${playerLabel}`,
      edge: position <= 5 ? "start" : position >= 95 ? "end" : "center",
      t: event.t,
      left: `${position}%`
    };
  });
}

export function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

export function snapSpeedToStop(value: number): number {
  const clamped = clampSpeed(value);
  return SPEED_STOPS.reduce((closest, stop) => (Math.abs(stop - clamped) < Math.abs(closest - clamped) ? stop : closest), SPEED_STOPS[0]);
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatSpeed(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
