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
          return (
            <button
              key={player.id}
              className={`${teamClassName(player.team)} ${selectedPlayerId === player.id ? "selected" : ""}`}
              onClick={() => setSelectedPlayerId(player.id)}
            >
              <span className="player-row">
                <span>{player.name}</span>
                <span className="boost-value">{boost === undefined ? "--" : Math.round(boost)}</span>
              </span>
              <span className="player-stats">
                <b>{stats.score}</b>
                <span>{stats.goals}G</span>
                {stats.assists > 0 ? <span>{stats.assists}A</span> : null}
                <span>{stats.saves}S</span>
                <span>{stats.shots}Sh</span>
                <span>{stats.demos}D</span>
              </span>
              <span className="player-context">
                {displayPlatform(player.platform)}
                {player.ping !== undefined ? <span>{player.ping} ping</span> : null}
                {player.cosmetics?.teamPaint ? <span>Paint {player.cosmetics.teamPaint.primaryColor}/{player.cosmetics.teamPaint.accentColor}</span> : null}
              </span>
              <meter min={0} max={100} value={boost ?? 0} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function displayPlatform(platform?: string) {
  if (!platform) return null;
  return <span>{platform.replace(/^OnlinePlatform_/, "")}</span>;
}
