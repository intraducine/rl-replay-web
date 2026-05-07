import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { scoreboardStateAt } from "./scoreboardState";

export function Scoreboard({ timeline }: { timeline: ReplayTimeline }) {
  const currentTime = useViewerStore((state) => state.currentTime);
  const state = scoreboardStateAt(timeline, currentTime);

  return (
    <div className="scoreboard">
      <div className="team blue">{state.blueScore}</div>
      <div className="clock">{state.clockText}</div>
      <div className="team orange">{state.orangeScore}</div>
    </div>
  );
}
