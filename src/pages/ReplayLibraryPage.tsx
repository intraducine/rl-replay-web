import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { clearReplays, deleteReplay, listReplays, loadReplay, replayLibraryStorageBytes, type StoredReplayRecord } from "../replay/ReplayStorage";
import { useReplayStore } from "../state/replayStore";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

export function ReplayLibraryPage({ onOpenReplay }: { onOpenReplay: () => void }) {
  const [records, setRecords] = useState<StoredReplayRecord[]>([]);
  const [usageBytes, setUsageBytes] = useState(0);
  const setTimeline = useReplayStore((state) => state.setTimeline);

  const refresh = async () => {
    const nextRecords = await listReplays();
    setRecords(nextRecords);
    setUsageBytes(replayLibraryStorageBytes(nextRecords));
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
              setRecords([]);
              setUsageBytes(0);
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
        <p className="muted">Replay library storage: {formatBytes(usageBytes)}.</p>
      </Panel>
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
