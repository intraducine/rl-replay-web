import { useShallow } from "zustand/shallow";
import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { scoreboardStateAt } from "./scoreboardState";

export function Scoreboard({ timeline }: { timeline: ReplayTimeline }) {
  const state = useViewerStore(useShallow((viewerState) => scoreboardStateAt(timeline, viewerState.currentTime)));

  return (
    <div className="scoreboard" aria-label={`Score: Blue ${state.blueScore}, ${state.clockText}, Orange ${state.orangeScore}`}>
      <div className="team blue">{state.blueScore}</div>
      <div className="clock">{state.clockText}</div>
      <div className="team orange">{state.orangeScore}</div>
    </div>
  );
}
