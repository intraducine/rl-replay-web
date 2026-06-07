import { useMemo } from "react";
import { ReplayLoader } from "../replay/ReplayLoader";
import { saveReplay } from "../replay/ReplayStorage";
import { SAMPLE_REPLAY_FILE_NAME, sampleReplayUrl } from "../replay/sampleReplay";
import { useReplayStore } from "../state/replayStore";
import { Button } from "../ui/Button";
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
      setError(parseError instanceof Error ? parseError.message : "Could not open replay.");
    } finally {
      setParsing(false);
    }
  };

  const loadSampleReplay = async () => {
    setError(undefined);
    setParsing(true);
    try {
      setProgress("Downloading sample replay", 0.02);
      const response = await fetch(sampleReplayUrl());
      if (!response.ok) throw new Error(`Sample replay download failed (${response.status}).`);
      const replayBlob = await response.blob();
      const replayFile = new File([replayBlob], SAMPLE_REPLAY_FILE_NAME, { type: "application/octet-stream" });
      const parsed = await loader.parse(replayFile, setProgress);
      await saveReplay(parsed, replayFile);
      setTimeline(parsed);
      onOpenReplay();
    } catch (sampleError) {
      setError(sampleError instanceof Error ? sampleError.message : "Sample replay loading failed.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <main className="page upload-page">
      <section className="upload-workspace">
        <FileDropzone onFile={parseFile} />
        <div className="upload-sidebar">
          <p className="project-label">Rocket League replay analysis</p>
          <h1>Open a Rocket League replay in a real-time 3D viewer.</h1>
          <p>
            Drop in a replay file to inspect the match, player movement, boost usage, goals, demos, saves, shots, and camera changes
            without sending the file anywhere.
          </p>
          <div className="sample-replay-action">
            <Button variant="primary" onClick={loadSampleReplay} disabled={parsing}>
              Open sample replay
            </Button>
            <span>Try the viewer immediately with the bundled replay.</span>
          </div>
          <div className="capability-list" aria-label="Project capabilities">
            <span>Local files stay on this device</span>
            <span>3D cars, ball, boost, scoreboard, and timeline</span>
            <span>Saved replays can be reopened from browser storage</span>
          </div>
        </div>
      </section>
      {parsing ? (
        <Panel title="Opening replay">
          <div className="progress-row">
            <progress max={1} value={progress ?? 0.15} />
            <span>{progressStage || "Reading replay file"}</span>
          </div>
        </Panel>
      ) : null}
      {error ? <div className="error-box">{error}</div> : null}
      {timeline ? (
        <Panel title="Last parsed replay">
          <dl className="metadata-grid replay-summary-grid">
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
