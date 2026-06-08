import type { ReplayTimeline } from "../replay/types";
import { TooltipBubble } from "../ui/Tooltip";
import { formatTime } from "./TimelineControls";

export function MatchMetadataBar({ timeline }: { timeline: ReplayTimeline }) {
  const metadata = timeline.metadata;
  const replayTitle = metadata.replayName ?? metadata.fileName;
  const items = [
    replayTitle ? { value: replayTitle, tooltip: "Replay name" } : undefined,
    metadata.matchType ? { value: metadata.matchType, tooltip: "Match type" } : undefined,
    metadata.teamSize ? { value: `${metadata.teamSize}v${metadata.teamSize}`, tooltip: "Team size" } : undefined,
    metadata.playlist === undefined ? undefined : { value: `Playlist ${metadata.playlist}`, tooltip: "Rocket League playlist id" },
    metadata.serverRegion ? { value: metadata.serverRegion, tooltip: "Server region" } : undefined,
    metadata.forfeit ? { value: "Forfeit", tooltip: "Match ended by forfeit" } : undefined,
    metadata.totalSecondsPlayed === undefined
      ? undefined
      : { value: `${formatTime(metadata.totalSecondsPlayed)} played`, tooltip: "In-game time played" },
    metadata.date ? { value: metadata.date, tooltip: "Replay save date" } : undefined
  ].filter((item): item is { value: string; tooltip: string } => Boolean(item));

  return (
    <div className="match-metadata-bar">
      {items.map((item, index) => (
        <span key={`${item.value}-${index}`} className="tooltip-target">
          {item.value}
          <TooltipBubble>{item.tooltip}</TooltipBubble>
        </span>
      ))}
    </div>
  );
}
