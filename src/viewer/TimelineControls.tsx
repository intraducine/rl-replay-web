import { FastForward, Pause, Play, Rewind, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useViewerStore } from "../state/viewerStore";
import { Button } from "../ui/Button";
import { TooltipBubble } from "../ui/Tooltip";
import { stepFrame } from "./PlaybackController";

const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const SPEED_STOPS = [0.25, 0.5, 1, 2, 4];

export type TimelineStatus = {
  cameraLabel: string;
  playerName?: string;
  boostRenderingEnabled: boolean;
};

export function TimelineControls({ events = [], status }: { events?: Array<{ t: number; type: string }>; status?: TimelineStatus }) {
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
  const eventMarkers = useMemo(() => replayEventMarkers(events, duration), [events, duration]);
  useTimelineKeyboardShortcuts();

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
          <div className="event-track" aria-label="Replay event markers">
            <span className="event-track-progress" style={{ width: `${percent}%` }} />
            {eventMarkers.map((event) => (
              <button
                type="button"
                key={event.key}
                className={`event-${event.type} tooltip-target`}
                style={{ left: event.left }}
                aria-label={`Jump to ${event.label} at ${formatTime(event.t)}`}
                onClick={() => setCurrentTime(event.t)}
              >
                <TooltipBubble>{event.label} · {formatTime(event.t)}</TooltipBubble>
              </button>
            ))}
          </div>
        </div>
        <span className="timeline-remaining"><b>{formatTime(remainingTime)}</b> left</span>
      </div>

      <div className="control-row">
        <span className="playback-state" aria-live="polite">{playing ? "Playing" : "Paused"}</span>
        <div className="transport-controls">
          <Button className="transport-skip" icon={<SkipBack size={19} />} onClick={() => setCurrentTime(0)} aria-label="Go to replay start" tooltip="Go to replay start" />
          <Button className="transport-seek" onClick={() => seekBy(-5)} aria-label="Jump backward 5 seconds" tooltip="Jump backward 5 seconds">−5s</Button>
          <Button className="transport-frame" icon={<Rewind size={21} />} onClick={() => setCurrentTime(stepFrame(currentTime, -1, duration))} aria-label="Previous frame" tooltip="Previous frame" />
          <Button
            variant="primary"
            className="transport-play"
            icon={playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause replay" : "Play replay"}
            tooltip="Play or pause replay"
          />
          <Button className="transport-frame" icon={<FastForward size={21} />} onClick={() => setCurrentTime(stepFrame(currentTime, 1, duration))} aria-label="Next frame" tooltip="Next frame" />
          <Button className="transport-seek" onClick={() => seekBy(5)} aria-label="Jump forward 5 seconds" tooltip="Jump forward 5 seconds">+5s</Button>
          <Button className="transport-skip" icon={<SkipForward size={17} />} onClick={() => setCurrentTime(duration)} aria-label="Go to replay end" tooltip="Go to replay end" />
        </div>
        <label className="speed-select tooltip-target">
          <span className="sr-only">Speed</span>
          <span className="speed-value" aria-hidden="true">{formatSpeed(speed)}×</span>
          <select value={speed} aria-label="Playback speed" onChange={(event) => setSpeed(clampSpeed(Number(event.currentTarget.value)))}>
            {SPEED_STOPS.map((value) => <option key={value} value={value}>{formatSpeed(value)}×</option>)}
          </select>
          <TooltipBubble>Playback speed</TooltipBubble>
        </label>
      </div>

      <div className="mobile-transport-controls" aria-label="Mobile playback controls">
        <Button icon={<SkipBack size={16} />} onClick={() => setCurrentTime(0)} aria-label="Go to replay start" tooltip="Go to replay start" />
        <Button onClick={() => seekBy(-5)}>−5s</Button>
        <Button variant="primary" icon={playing ? <Pause size={18} /> : <Play size={18} />} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause replay" : "Play replay"} />
        <Button onClick={() => seekBy(5)}>+5s</Button>
        <Button icon={<SkipForward size={16} />} onClick={() => setCurrentTime(duration)} aria-label="Go to replay end" tooltip="Go to replay end" />
      </div>

      <div className="sr-only" aria-label="Replay playback status">
        {status ? `${status.cameraLabel} camera. ${status.playerName ?? "No player selected"}. Boost rendering ${status.boostRenderingEnabled ? "on" : "off"}.` : null}
        <kbd>Space</kbd> Play/Pause. <kbd>WASD</kbd> Move. <kbd>Q/E</kbd> Down/Up. <kbd>Mouse drag</kbd> Look.
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

function eventLabel(event: { t: number; type: string; label?: string }) {
  return event.label ? `${event.type}: ${event.label}` : event.type;
}

function replayEventMarkers(events: Array<{ t: number; type: string; label?: string }>, duration: number) {
  const safeDuration = Math.max(duration, 1);
  return events.map((event, index) => ({
    key: `${event.type}-${event.t}-${index}`,
    type: event.type,
    label: eventLabel(event),
    t: event.t,
    left: `${(event.t / safeDuration) * 100}%`
  }));
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
