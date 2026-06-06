import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { TooltipBubble } from "../ui/Tooltip";
import { livePlayerStatsAt } from "./playerStats";
import { teamClassName } from "./teamColors";

export function PlayerList({ timeline, boostByPlayer = {} }: { timeline: ReplayTimeline; boostByPlayer?: Record<string, number | undefined> }) {
  const selectedPlayerId = useViewerStore((state) => state.selectedPlayerId);
  const setSelectedPlayerId = useViewerStore((state) => state.setSelectedPlayerId);
  const currentTime = useViewerStore((state) => state.currentTime);

  return (
    <div className="player-list-scroll">
      <div className="player-list">
        {timeline.metadata.players.map((player) => {
          const boost = boostByPlayer[player.id];
          const stats = livePlayerStatsAt(timeline, player.id, currentTime);
          const boostLabel = boost === undefined ? "--" : boost.toFixed(1);
          return (
            <button
              key={player.id}
              className={`${teamClassName(player.team)} ${selectedPlayerId === player.id ? "selected" : ""}`}
              onClick={() => setSelectedPlayerId(player.id)}
              aria-label={`Select ${player.name}`}
            >
              <TooltipBubble>Select {player.name}</TooltipBubble>
              <span className="player-row">
                <span>{player.name}</span>
                <span className="boost-value tooltip-target">
                  {boostLabel}
                  <TooltipBubble>Interpolated boost amount</TooltipBubble>
                </span>
              </span>
              <span className="player-stats">
                <span className="tooltip-target">
                  {stats.goals} Goals
                  <TooltipBubble>Goals scored by this player</TooltipBubble>
                </span>
                <span className="tooltip-target">
                  {stats.saves} Saves
                  <TooltipBubble>Saves credited to this player</TooltipBubble>
                </span>
                <span className="tooltip-target">
                  {stats.shots} Shots
                  <TooltipBubble>Shots credited to this player</TooltipBubble>
                </span>
                <span className="tooltip-target">
                  {stats.demos} Demos
                  <TooltipBubble>Demolitions credited to this player</TooltipBubble>
                </span>
              </span>
              <span className="player-rank tooltip-target">
                Rank/MMR unavailable
                <TooltipBubble>Rank and MMR are not stored in the replay data this parser currently reads.</TooltipBubble>
              </span>
              <span className="boost-meter-wrap tooltip-target">
                <meter min={0} max={100} value={boost ?? 0} />
                <TooltipBubble>Interpolated boost meter</TooltipBubble>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
