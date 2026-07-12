import { useShallow } from "zustand/shallow";
import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { scoreboardStateAt } from "./scoreboardState";

export function Scoreboard({ timeline }: { timeline: ReplayTimeline }) {
  const state = useViewerStore(useShallow((viewerState) => scoreboardStateAt(timeline, viewerState.currentTime)));

  return (
    <div className="scoreboard" aria-label={`Score: Blue ${state.blueScore}, ${state.clockText}, Orange ${state.orangeScore}`}>
      <div className="team blue">{state.blueScore}</div>
      <div className="clock">
        <span>{state.clockText}</span>
        <span className="clock-score-pips" aria-hidden="true">
          <i className="blue" />
          <i />
          <i className="orange" />
        </span>
      </div>
      <div className="team orange">{state.orangeScore}</div>
    </div>
  );
}
