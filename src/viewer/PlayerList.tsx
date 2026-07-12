import { useShallow } from "zustand/shallow";
import type { ReplayPlayerRank, ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { emptyLivePlayerStats, type LivePlayerStats } from "./playerStats";
import { teamClassName } from "./teamColors";

export function PlayerList({
  timeline,
  boostByPlayer = {},
  statsByPlayer = {}
}: {
  timeline: ReplayTimeline;
  boostByPlayer?: Record<string, number | undefined>;
  statsByPlayer?: Record<string, LivePlayerStats | undefined>;
}) {
  const { selectedPlayerId, setSelectedPlayerId } = useViewerStore(
    useShallow((state) => ({
      selectedPlayerId: state.selectedPlayerId,
      setSelectedPlayerId: state.setSelectedPlayerId
    }))
  );

  return (
    <div className="player-list-scroll" aria-label="Players">
      <div className="player-list">
        {timeline.metadata.players.map((player) => {
          const boost = boostByPlayer[player.id];
          const stats = statsByPlayer[player.id] ?? emptyLivePlayerStats();
          const boostValue = boost ?? 0;
          const boostLabel = boostValue.toFixed(1);
          const rank = formatPlayerRank(player.rank);
          const hasRank = Boolean(player.rank && (player.rank.skillTier !== undefined || player.rank.mmr !== undefined));
          return (
            <button
              type="button"
              key={player.id}
              className={`${teamClassName(player.team)} ${selectedPlayerId === player.id ? "selected" : ""}`}
              onClick={() => setSelectedPlayerId(player.id)}
              aria-label={`Follow ${player.name}, ${Math.round(boostValue)} percent boost`}
              aria-pressed={selectedPlayerId === player.id}
            >
              <span className="player-row">
                <strong>{player.name}</strong>
                <span className="boost-value">
                  {boostLabel}<small> boost</small>
                </span>
              </span>
              <span className="player-stats">
                <span aria-label={`${stats.goals} goals`}>
                  <strong>{stats.goals}</strong> G
                </span>
                <span aria-label={`${stats.saves} saves`}>
                  <strong>{stats.saves}</strong> Sv
                </span>
                <span aria-label={`${stats.shots} shots`}>
                  <strong>{stats.shots}</strong> Sh
                </span>
                <span aria-label={`${stats.demos} demolitions`}>
                  <strong>{stats.demos}</strong> D
                </span>
              </span>
              {hasRank ? (
                <span className="player-rank" title={rank.tooltip}>
                  {rank.label}
                </span>
              ) : null}
              <span className="boost-meter-wrap">
                <meter min={0} max={100} value={boost ?? 0} aria-label={`${player.name} boost`} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatPlayerRank(rank: ReplayPlayerRank | undefined): { label: string; tooltip: string } {
  if (!rank || (rank.skillTier === undefined && rank.mmr === undefined)) {
    return {
      label: "Rank not saved",
      tooltip: "This replay does not include a saved rank or Elo/MMR value for this player."
    };
  }

  const tier = rank.skillTier === undefined ? undefined : skillTierName(rank.skillTier);
  const elo = rank.mmr === undefined ? undefined : `${rank.mmr} Elo`;
  const label = [tier, elo].filter(Boolean).join(" / ");
  return {
    label,
    tooltip: "Rank and Elo/MMR from replay metadata when the replay includes those fields."
  };
}

function skillTierName(tier: number): string {
  const names = [
    "Unranked",
    "Bronze I",
    "Bronze II",
    "Bronze III",
    "Silver I",
    "Silver II",
    "Silver III",
    "Gold I",
    "Gold II",
    "Gold III",
    "Platinum I",
    "Platinum II",
    "Platinum III",
    "Diamond I",
    "Diamond II",
    "Diamond III",
    "Champion I",
    "Champion II",
    "Champion III",
    "Grand Champion I",
    "Grand Champion II",
    "Grand Champion III",
    "Supersonic Legend"
  ];
  return names[tier] ?? `Tier ${tier}`;
}
