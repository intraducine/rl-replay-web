import type { ReplayTimeline } from "../replay/types";
import { ReplayViewer } from "../viewer/ReplayViewer";

export function ReplayPage({ timeline }: { timeline?: ReplayTimeline }) {
  if (!timeline) {
    return (
      <main className="empty-state">
        <h1>No replay loaded</h1>
        <p>Upload a replay or open one from the local library.</p>
      </main>
    );
  }

  return <ReplayViewer timeline={timeline} />;
}
