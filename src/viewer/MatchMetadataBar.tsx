import type { ReplayTimeline } from "../replay/types";
import { formatTime } from "./TimelineControls";

export function MatchMetadataBar({ timeline }: { timeline: ReplayTimeline }) {
  const metadata = timeline.metadata;
  const items = [
    metadata.replayName ?? metadata.fileName,
    metadata.matchType,
    metadata.teamSize ? `${metadata.teamSize}v${metadata.teamSize}` : undefined,
    metadata.playlist === undefined ? undefined : `Playlist ${metadata.playlist}`,
    metadata.serverRegion,
    metadata.forfeit ? "Forfeit" : undefined,
    metadata.totalSecondsPlayed === undefined ? undefined : `${formatTime(metadata.totalSecondsPlayed)} played`,
    metadata.date
  ].filter(Boolean);

  return (
    <div className="match-metadata-bar">
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </div>
  );
}
