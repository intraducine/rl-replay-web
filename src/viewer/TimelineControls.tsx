import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { useEffect } from "react";
import { useViewerStore } from "../state/viewerStore";
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { stepFrame } from "./PlaybackController";

const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const SPEED_STOPS = [0.25, 0.5, 1, 2, 4];

export function TimelineControls({ events = [] }: { events?: Array<{ t: number; type: string }> }) {
  const { playing, currentTime, duration, speed, setPlaying, setCurrentTime, setSpeed, seekBy } = useViewerStore();
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
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
        <div className="event-track">
          <span style={{ width: `${percent}%` }} />
          {events.map((event, index) => (
            <i
              key={`${event.type}-${event.t}-${index}`}
              className={`event-${event.type}`}
              style={{ left: `${(event.t / Math.max(duration, 1)) * 100}%` }}
              title={eventLabel(event)}
            />
          ))}
        </div>
      </div>
      <div className="control-row">
        <div className="transport-controls">
          <Button icon={<RotateCcw size={16} />} onClick={() => setCurrentTime(0)} aria-label="Restart" title="Restart replay" />
          <Button onClick={() => seekBy(-5)} title="Jump backward 5 seconds">
            −5s
          </Button>
          <Button
            icon={<StepBack size={16} />}
            onClick={() => setCurrentTime(stepFrame(currentTime, -1, duration))}
            aria-label="Previous frame"
            title="Previous frame"
          />
          <Button variant="primary" icon={playing ? <Pause size={16} /> : <Play size={16} />} onClick={() => setPlaying(!playing)}>
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            icon={<StepForward size={16} />}
            onClick={() => setCurrentTime(stepFrame(currentTime, 1, duration))}
            aria-label="Next frame"
            title="Next frame"
          />
          <Button onClick={() => seekBy(5)} title="Jump forward 5 seconds">
            +5s
          </Button>
        </div>
        <div className="speed-control">
          <label className="speed-slider" title="Playback speed">
            <span>Speed</span>
            <input
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={0.25}
              list="speed-stops"
              value={speed}
              onChange={(event) => setSpeed(clampSpeed(Number(event.currentTarget.value)))}
            />
            <datalist id="speed-stops">
              {SPEED_STOPS.map((value) => (
                <option key={value} value={value} label={`${value}x`} />
              ))}
            </datalist>
          </label>
          <label className="speed-input" title="Enter playback speed from 0.25x to 4x">
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
          </label>
        </div>
      </div>
      <div className="mobile-transport-controls" aria-label="Mobile playback controls">
        <Button onClick={() => seekBy(-5)} title="Jump backward 5 seconds">
          −5s
        </Button>
        <Button variant="primary" icon={playing ? <Pause size={16} /> : <Play size={16} />} onClick={() => setPlaying(!playing)} title="Play or pause replay">
          {playing ? "Pause" : "Play"}
        </Button>
        <Button onClick={() => seekBy(5)} title="Jump forward 5 seconds">
          +5s
        </Button>
      </div>
      <div className="control-help" aria-label="Playback shortcuts">
        <span title="Press Space to pause or resume playback">Space Play/Pause</span>
        <span title="Press Left or Right to jump five seconds">←/→ 5s</span>
        <span title="Hold Shift with Left or Right to scrub one second">Shift + ←/→ 1s</span>
      </div>
    </div>
  );
}

export function useTimelineKeyboardShortcuts() {
  const seekBy = useViewerStore((state) => state.seekBy);
  const setCurrentTime = useViewerStore((state) => state.setCurrentTime);
  const setPlaying = useViewerStore((state) => state.setPlaying);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(event.shiftKey ? -1 : -5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(event.shiftKey ? 1 : 5);
      } else if (event.key === "Home") {
        event.preventDefault();
        setCurrentTime(0);
      } else if (event.code === "Space") {
        event.preventDefault();
        setPlaying(!useViewerStore.getState().playing);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [seekBy, setCurrentTime, setPlaying]);
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function eventLabel(event: { t: number; type: string; label?: string }) {
  return event.label ? `${event.type}: ${event.label}` : event.type;
}

function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
