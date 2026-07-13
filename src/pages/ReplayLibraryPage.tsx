import { Clock3, HardDrive, MapPin, Play, Trash2, Upload, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { clearReplays, deleteReplay, listReplays, loadReplay, replayLibraryStorageBytes, type StoredReplayRecord } from "../replay/ReplayStorage";
import { useReplayStore } from "../state/replayStore";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Panel } from "../ui/Panel";
import { TooltipBubble } from "../ui/Tooltip";

type PendingConfirmation = { kind: "clear" } | { kind: "delete"; record: StoredReplayRecord };

export function ReplayLibraryPage({ onOpenReplay, onUpload }: { onOpenReplay: (id: string) => void; onUpload: () => void }) {
  const [records, setRecords] = useState<StoredReplayRecord[]>([]);
  const [usageBytes, setUsageBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string>();
  const [error, setError] = useState<string>();
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>();
  const timeline = useReplayStore((state) => state.timeline);
  const setTimeline = useReplayStore((state) => state.setTimeline);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const nextRecords = await listReplays();
      setRecords(nextRecords);
      setUsageBytes(replayLibraryStorageBytes(nextRecords));
    } catch (libraryError) {
      setError(libraryError instanceof Error ? libraryError.message : "Saved replays could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openReplay = async (id: string) => {
    setOpeningId(id);
    setError(undefined);
    try {
      const nextTimeline = await loadReplay(id);
      if (!nextTimeline) throw new Error("This saved replay is no longer available.");
      setTimeline(nextTimeline);
      onOpenReplay(nextTimeline.metadata.id);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Replay could not be opened.");
    } finally {
      setOpeningId(undefined);
    }
  };

  const confirmPendingAction = async () => {
    const pending = pendingConfirmation;
    setPendingConfirmation(undefined);
    if (!pending) return;

    if (pending.kind === "clear") {
      await clearReplays();
      setTimeline(undefined);
      setRecords([]);
      setUsageBytes(0);
      return;
    }

    await deleteReplay(pending.record.id);
    if (timeline?.metadata.id === pending.record.id) setTimeline(undefined);
    await refresh();
  };

  const pendingRecord = pendingConfirmation?.kind === "delete" ? pendingConfirmation.record : undefined;

  return (
    <main className="page library-page">
      <Panel
        title="Replay library"
        actions={
          <Button
            variant="danger"
            tooltip="Remove every saved replay from this browser"
            disabled={records.length === 0}
            onClick={() => setPendingConfirmation({ kind: "clear" })}
          >
            Clear library
          </Button>
        }
      >
        <div className="library-summary" aria-live="polite">
          <span>{records.length === 1 ? "1 saved replay" : `${records.length} saved replays`}</span>
          <span>{formatBytes(usageBytes)} stored on this device</span>
        </div>
        {error ? <div className="error-box library-error" role="alert">{error}</div> : null}
        <div className="library-list" aria-busy={loading}>
          {loading ? <div className="library-loading">Loading saved replays…</div> : null}
          {!loading && records.length === 0 ? (
            <div className="library-empty">
              <div>
                <strong>No saved replays yet</strong>
                <span>Open a replay once and it will stay available here on this device.</span>
              </div>
              <Button variant="primary" icon={<Upload size={16} />} onClick={onUpload}>Choose replay</Button>
            </div>
          ) : null}
          {records.map((record) => {
            const isOpening = openingId === record.id;
            return (
              <article key={record.id} className="library-row">
                <button className="library-open-button tooltip-target" disabled={isOpening} onClick={() => openReplay(record.id)}>
                  <span className="library-row-title">
                    <span className="library-play-icon" aria-hidden="true"><Play size={15} fill="currentColor" /></span>
                    <strong>{record.metadata.replayName ?? record.metadata.fileName}</strong>
                    <span className="library-open-label">{isOpening ? "Opening…" : "Open"}</span>
                  </span>
                  <span className="library-row-meta">
                    <span><MapPin size={13} />{formatMapName(record.metadata.mapName)}</span>
                    <span><Users size={13} />{record.metadata.players.length} players</span>
                    <span><Clock3 size={13} />{formatDuration(record.metadata.durationSeconds)}</span>
                    <span><HardDrive size={13} />{formatBytes(record.timelineBlob.size + (record.originalReplayBlob?.size ?? 0))}</span>
                  </span>
                  <TooltipBubble>Open this saved replay</TooltipBubble>
                </button>
                <Button
                  variant="ghost"
                  icon={<Trash2 size={16} />}
                  aria-label={`Delete ${record.metadata.replayName ?? record.metadata.fileName}`}
                  tooltip="Delete this saved replay"
                  onClick={() => setPendingConfirmation({ kind: "delete", record })}
                />
              </article>
            );
          })}
        </div>
      </Panel>
      <ConfirmDialog
        open={Boolean(pendingConfirmation)}
        title={pendingRecord ? "Delete this replay?" : "Clear the replay library?"}
        description={
          pendingRecord
            ? `${pendingRecord.metadata.replayName ?? pendingRecord.metadata.fileName} will be removed from this device.`
            : "Every saved replay will be removed from this device. This cannot be undone."
        }
        confirmLabel={pendingRecord ? "Delete replay" : "Clear library"}
        onCancel={() => setPendingConfirmation(undefined)}
        onConfirm={confirmPendingAction}
      />
    </main>
  );
}

function formatMapName(mapName?: string): string {
  if (!mapName) return "Unknown map";
  if (mapName.toLowerCase() === "cs_p") return "Champions Field";
  return mapName.replace(/_/g, " ");
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
