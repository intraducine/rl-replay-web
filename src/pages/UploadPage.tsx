import { useMemo } from "react";
import { ReplayLoader } from "../replay/ReplayLoader";
import { saveReplay } from "../replay/ReplayStorage";
import { useReplayStore } from "../state/replayStore";
import { FileDropzone } from "../ui/FileDropzone";
import { Panel } from "../ui/Panel";

export function UploadPage({ onOpenReplay }: { onOpenReplay: () => void }) {
  const loader = useMemo(() => new ReplayLoader(), []);
  const { timeline, parsing, progressStage, progress, error, setTimeline, setParsing, setProgress, setError } = useReplayStore();

  const parseFile = async (file: File) => {
    setError(undefined);
    setParsing(true);
    try {
      const parsed = await loader.parse(file, setProgress);
      await saveReplay(parsed, file);
      setTimeline(parsed);
      onOpenReplay();
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Replay parsing failed.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <main className="page upload-page">
      <FileDropzone onFile={parseFile} />
      {parsing ? (
        <Panel title="Parsing">
          <div className="progress-row">
            <progress max={1} value={progress ?? 0.15} />
            <span>{progressStage || "Starting parser"}</span>
          </div>
        </Panel>
      ) : null}
      {error ? <div className="error-box">{error}</div> : null}
      {timeline ? (
        <Panel title="Last parsed replay">
          <dl className="metadata-grid">
            <div>
              <dt>Name</dt>
              <dd>{timeline.metadata.replayName ?? timeline.metadata.fileName}</dd>
            </div>
            <div>
              <dt>Map</dt>
              <dd>{timeline.metadata.mapName ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Players</dt>
              <dd>{timeline.metadata.players.length}</dd>
            </div>
            <div>
              <dt>Frames</dt>
              <dd>{timeline.frames.length.toLocaleString()}</dd>
            </div>
          </dl>
        </Panel>
      ) : null}
    </main>
  );
}
