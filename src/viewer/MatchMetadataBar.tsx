import type { ReplayTimeline } from "../replay/types";
import { TooltipBubble } from "../ui/Tooltip";
import { formatTime } from "./TimelineControls";

export function MatchMetadataBar({ timeline }: { timeline: ReplayTimeline }) {
  const metadata = timeline.metadata;
  const replayTitle = metadata.replayName ?? metadata.fileName;
  const items = [
    replayTitle ? { value: replayTitle, title: "Replay name", tooltip: "Replay name · the match file you are reviewing." } : undefined,
    metadata.matchType ? { value: metadata.matchType, title: "Match type", tooltip: "Match type · how this match was played." } : undefined,
    metadata.teamSize ? { value: `${metadata.teamSize}v${metadata.teamSize}`, title: "Team size", tooltip: "Team size · players on each team." } : undefined,
    metadata.playlist === undefined ? undefined : { value: `Playlist ${metadata.playlist}`, title: "Rocket League playlist id", tooltip: "Playlist · the Rocket League mode identifier." },
    metadata.serverRegion ? { value: metadata.serverRegion, title: "Server region", tooltip: "Server region · where the match server was located." } : undefined,
    metadata.forfeit ? { value: "Forfeit", title: "Match ended by forfeit", tooltip: "Forfeit · the match ended before the clock ran out." } : undefined,
    metadata.totalSecondsPlayed === undefined
      ? undefined
      : { value: `${formatTime(metadata.totalSecondsPlayed)} played`, title: "In-game time played", tooltip: "Played · how long the match was active." },
    metadata.date ? { value: metadata.date, title: "Replay save date", tooltip: "Saved · when this replay was recorded." } : undefined
  ].filter((item): item is { value: string; title: string; tooltip: string } => Boolean(item));

  return (
    <div className="match-metadata-bar" aria-label="Replay details">
      {items.map((item, index) => (
        <span key={`${item.value}-${index}`} className="metadata-pill tooltip-target" title={item.title} aria-label={item.tooltip}>
          {item.value}
          <TooltipBubble>{item.tooltip}</TooltipBubble>
        </span>
      ))}
    </div>
  );
}
