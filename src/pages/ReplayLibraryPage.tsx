import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { clearReplays, deleteReplay, estimateStorageUsage, listReplays, loadReplay, type StoredReplayRecord } from "../replay/ReplayStorage";
import { useReplayStore } from "../state/replayStore";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

export function ReplayLibraryPage({ onOpenReplay }: { onOpenReplay: () => void }) {
  const [records, setRecords] = useState<StoredReplayRecord[]>([]);
  const [usage, setUsage] = useState<StorageEstimate>();
  const setTimeline = useReplayStore((state) => state.setTimeline);

  const refresh = async () => {
    setRecords(await listReplays());
    setUsage(await estimateStorageUsage());
  };

  useEffect(() => {
    refresh();
  }, []);

  const openReplay = async (id: string) => {
    const timeline = await loadReplay(id);
    if (timeline) {
      setTimeline(timeline);
      onOpenReplay();
    }
  };

  return (
    <main className="page">
      <Panel
        title="Local replay library"
        actions={
          <Button
            variant="danger"
            onClick={async () => {
              await clearReplays();
              await refresh();
            }}
          >
            Clear all
          </Button>
        }
      >
        <div className="library-list">
          {records.length === 0 ? <p className="muted">No saved parsed replays yet.</p> : null}
          {records.map((record) => (
            <article key={record.id} className="library-row">
              <button onClick={() => openReplay(record.id)}>
                <strong>{record.metadata.replayName ?? record.metadata.fileName}</strong>
                <span>
                  {record.metadata.mapName ?? "Unknown map"} · {record.metadata.players.length} players ·{" "}
                  {new Date(record.updatedAt).toLocaleString()}
                </span>
              </button>
              <Button
                variant="ghost"
                icon={<Trash2 size={16} />}
                aria-label="Delete replay"
                onClick={async () => {
                  await deleteReplay(record.id);
                  await refresh();
                }}
              />
            </article>
          ))}
        </div>
        {usage ? (
          <p className="muted">
            Storage: {formatBytes(usage.usage ?? 0)} used of {formatBytes(usage.quota ?? 0)} available.
          </p>
        ) : null}
      </Panel>
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
