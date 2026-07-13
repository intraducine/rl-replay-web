import type { ReplayTimeline } from "../replay/types";
import { Button } from "../ui/Button";
import { ReplayViewer } from "../viewer/ReplayViewer";

export function ReplayPage({
  timeline,
  loading = false,
  error,
  onUpload,
  onOpenLibrary
}: {
  timeline?: ReplayTimeline;
  loading?: boolean;
  error?: string;
  onUpload: () => void;
  onOpenLibrary: () => void;
}) {
  if (loading) {
    return (
      <main className="empty-state" aria-live="polite">
        <div className="empty-state-card">
          <p className="project-label">Replay viewer</p>
          <h1>Opening saved replay</h1>
          <p>Loading the replay from this browser.</p>
          <progress className="route-progress" />
        </div>
      </main>
    );
  }

  if (!timeline) {
    return (
      <main className="empty-state">
        <div className="empty-state-card">
          <p className="project-label">Replay viewer</p>
          <h1>No replay loaded</h1>
          <p>{error ?? "Choose a replay file or reopen one saved on this device."}</p>
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
