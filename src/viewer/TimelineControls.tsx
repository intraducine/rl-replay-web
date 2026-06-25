import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useViewerStore } from "../state/viewerStore";
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { TooltipBubble } from "../ui/Tooltip";
import { stepFrame } from "./PlaybackController";

const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const SPEED_STOPS = [0.25, 0.5, 1, 2, 4];

export function TimelineControls({ events = [] }: { events?: Array<{ t: number; type: string }> }) {
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
  const eventMarkers = useMemo(() => replayEventMarkers(events, duration), [events, duration]);
  useTimelineKeyboardShortcuts();

  return (
    <div className="timeline-controls">
      <div className="timeline-shell">
        <Slider
          label="Timeline"
          valueLabel={`${formatTime(currentTime)} / ${formatTime(duration)}`}
          min={0}
          max={Math.max(duration, 1)}
          step={0.01}
          value={currentTime}
          onChange={(event) => setCurrentTime(Number(event.currentTarget.value))}
        />
        <div className="event-track" aria-label="Replay event markers">
          <span className="event-track-progress" style={{ width: `${percent}%` }} />
          {eventMarkers.map((event) => (
            <i
              key={event.key}
              className={`event-${event.type} tooltip-target`}
              style={{ left: event.left }}
              aria-label={event.label}
            >
              <TooltipBubble>{event.label}</TooltipBubble>
            </i>
          ))}
        </div>
      </div>
      <div className="control-row">
        <div className="transport-controls">
          <Button icon={<RotateCcw size={16} />} onClick={() => setCurrentTime(0)} aria-label="Restart" className="tooltip-target">
            <TooltipBubble>Restart replay</TooltipBubble>
          </Button>
          <Button onClick={() => seekBy(-5)} className="tooltip-target">
            −5s
            <TooltipBubble>Jump backward 5 seconds</TooltipBubble>
          </Button>
          <Button
            icon={<StepBack size={16} />}
            onClick={() => setCurrentTime(stepFrame(currentTime, -1, duration))}
            aria-label="Previous frame"
            className="tooltip-target"
          >
            <TooltipBubble>Previous frame</TooltipBubble>
          </Button>
          <Button
            variant="primary"
            icon={playing ? <Pause size={16} /> : <Play size={16} />}
            onClick={() => setPlaying(!playing)}
            className="tooltip-target"
          >
            {playing ? "Pause" : "Play"}
            <TooltipBubble>Play or pause replay</TooltipBubble>
          </Button>
          <Button
            icon={<StepForward size={16} />}
            onClick={() => setCurrentTime(stepFrame(currentTime, 1, duration))}
            aria-label="Next frame"
            className="tooltip-target"
          >
            <TooltipBubble>Next frame</TooltipBubble>
          </Button>
          <Button onClick={() => seekBy(5)} className="tooltip-target">
            +5s
            <TooltipBubble>Jump forward 5 seconds</TooltipBubble>
          </Button>
        </div>
        <div className="speed-control">
          <label className="speed-slider tooltip-target">
            <span>Speed</span>
            <input
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={0.01}
              list="speed-stops"
              value={speed}
              onChange={(event) => setSpeed(snapSpeedToStop(Number(event.currentTarget.value)))}
            />
            <datalist id="speed-stops">
              {SPEED_STOPS.map((value) => (
                <option key={value} value={value} label={`${value}x`} />
              ))}
            </datalist>
            <span className="speed-stops" aria-label="Speed stops">
              {SPEED_STOPS.map((value) => (
                <button key={value} type="button" className="tooltip-target" onClick={() => setSpeed(value)} aria-label={`Set speed to ${value}x`}>
                  {value}x
                  <TooltipBubble>Set playback speed to {value}x</TooltipBubble>
                </button>
              ))}
            </span>
            <TooltipBubble>Playback speed</TooltipBubble>
          </label>
          <label className="speed-input tooltip-target">
            <span className="sr-only">Playback speed value</span>
            <input
              type="number"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={0.25}
              value={speed}
              onChange={(event) => setSpeed(clampSpeed(Number(event.currentTarget.value)))}
            />
            <span>x</span>
            <TooltipBubble>Enter playback speed from 0.25x to 4x</TooltipBubble>
          </label>
        </div>
      </div>
      <div className="mobile-transport-controls" aria-label="Mobile playback controls">
        <Button icon={<RotateCcw size={16} />} onClick={() => setCurrentTime(0)} aria-label="Restart replay" className="tooltip-target">
          Restart
          <TooltipBubble>Restart replay</TooltipBubble>
        </Button>
        <Button onClick={() => seekBy(-5)} className="tooltip-target">
          −5s
          <TooltipBubble>Jump backward 5 seconds</TooltipBubble>
        </Button>
        <Button
          icon={<StepBack size={16} />}
          onClick={() => setCurrentTime(stepFrame(currentTime, -1, duration))}
          aria-label="Previous frame"
          className="tooltip-target"
        >
          Frame
          <TooltipBubble>Previous frame</TooltipBubble>
        </Button>
        <Button variant="primary" icon={playing ? <Pause size={16} /> : <Play size={16} />} onClick={() => setPlaying(!playing)} className="tooltip-target">
          {playing ? "Pause" : "Play"}
          <TooltipBubble>Play or pause replay</TooltipBubble>
        </Button>
        <Button
          icon={<StepForward size={16} />}
          onClick={() => setCurrentTime(stepFrame(currentTime, 1, duration))}
          aria-label="Next frame"
          className="tooltip-target"
        >
          Frame
          <TooltipBubble>Next frame</TooltipBubble>
        </Button>
        <Button onClick={() => seekBy(5)} className="tooltip-target">
          +5s
          <TooltipBubble>Jump forward 5 seconds</TooltipBubble>
        </Button>
      </div>
      <div className="control-help" aria-label="Playback shortcuts">
        <span className="tooltip-target">
          Space Play/Pause
          <TooltipBubble>Press Space to pause or resume playback</TooltipBubble>
        </span>
        <span className="tooltip-target">
          ←/→ 5s
          <TooltipBubble>Press Left or Right to jump five seconds</TooltipBubble>
        </span>
        <span className="tooltip-target">
          Shift + ←/→ 1s
          <TooltipBubble>Hold Shift with Left or Right to scrub one second</TooltipBubble>
        </span>
        <span className="tooltip-target">
          WASD Move
          <TooltipBubble>Move the free camera across the field</TooltipBubble>
        </span>
        <span className="tooltip-target">
          Q/E Down/Up
          <TooltipBubble>Move the free camera vertically</TooltipBubble>
        </span>
        <span className="tooltip-target">
          Mouse Drag Orbit
          <TooltipBubble>Drag in free camera to look around</TooltipBubble>
        </span>
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
  return events.map((event, index) => {
    const label = eventLabel(event);
    return {
      key: `${event.type}-${event.t}-${index}`,
      type: event.type,
      label,
      left: `${(event.t / safeDuration) * 100}%`
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
