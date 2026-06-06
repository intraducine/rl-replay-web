import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { useEffect } from "react";
import { useViewerStore } from "../state/viewerStore";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Slider } from "../ui/Slider";
import { stepFrame } from "./PlaybackController";

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
        <Button icon={<RotateCcw size={16} />} onClick={() => setCurrentTime(0)} aria-label="Restart" />
        <Button onClick={() => seekBy(-5)}>−5s</Button>
        <Button icon={<StepBack size={16} />} onClick={() => setCurrentTime(stepFrame(currentTime, -1, duration))} aria-label="Previous frame" />
        <Button variant="primary" icon={playing ? <Pause size={16} /> : <Play size={16} />} onClick={() => setPlaying(!playing)}>
          {playing ? "Pause" : "Play"}
        </Button>
        <Button icon={<StepForward size={16} />} onClick={() => setCurrentTime(stepFrame(currentTime, 1, duration))} aria-label="Next frame" />
        <Button onClick={() => seekBy(5)}>+5s</Button>
        <Select
          label="Speed"
          value={speed}
          options={[0.25, 0.5, 1, 2, 4].map((value) => ({ value, label: `${value}x` }))}
          onChange={(event) => setSpeed(Number(event.currentTarget.value))}
        />
      </div>
    </div>
  );
}

export function useTimelineKeyboardShortcuts() {
  const seekBy = useViewerStore((state) => state.seekBy);
  const setCurrentTime = useViewerStore((state) => state.setCurrentTime);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [seekBy, setCurrentTime]);
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function eventLabel(event: { t: number; type: string; label?: string }) {
  return event.label ? `${event.type}: ${event.label}` : event.type;
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
