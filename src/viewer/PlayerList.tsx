import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
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
              title={`Select ${player.name}`}
            >
              <span className="player-row">
                <span>{player.name}</span>
                <span className="boost-value" title="Interpolated boost amount">
                  {boostLabel}
                </span>
              </span>
              <span className="player-stats">
                <span title="Goals">{stats.goals} Goals</span>
                <span title="Saves">{stats.saves} Saves</span>
                <span title="Shots">{stats.shots} Shots</span>
                <span title="Demolitions">{stats.demos} Demos</span>
              </span>
              <meter min={0} max={100} value={boost ?? 0} title="Interpolated boost meter" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
