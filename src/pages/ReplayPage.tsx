import type { ReplayTimeline } from "../replay/types";
import { Button } from "../ui/Button";
import { ReplayViewer } from "../viewer/ReplayViewer";

export function ReplayPage({
  timeline,
  onUpload,
  onOpenLibrary
}: {
  timeline?: ReplayTimeline;
  onUpload: () => void;
  onOpenLibrary: () => void;
}) {
  if (!timeline) {
    return (
      <main className="empty-state">
        <div className="empty-state-card">
          <p className="project-label">Replay viewer</p>
          <h1>No replay loaded</h1>
          <p>Choose a replay file or reopen one saved on this device.</p>
          <div className="empty-state-actions">
            <Button variant="primary" onClick={onUpload}>Choose replay</Button>
            <Button onClick={onOpenLibrary}>Open library</Button>
          </div>
        </div>
      </main>
    );
  }

  return <ReplayViewer timeline={timeline} />;
}
