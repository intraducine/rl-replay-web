import { useMemo, useState } from "react";
import { ReplayLoader } from "../replay/ReplayLoader";
import { saveReplay } from "../replay/ReplayStorage";
import { SAMPLE_REPLAY_FILE_NAME, sampleReplayUrl } from "../replay/sampleReplay";
import { useReplayStore } from "../state/replayStore";
import { Button } from "../ui/Button";
import { FileDropzone } from "../ui/FileDropzone";
import { Panel } from "../ui/Panel";

export function UploadPage({ onOpenReplay }: { onOpenReplay: (id: string) => void }) {
  const loader = useMemo(() => new ReplayLoader(), []);
  const [openingSource, setOpeningSource] = useState<"file" | "sample">();
  const { timeline, parsing, progressStage, progress, error, setTimeline, setParsing, setProgress, setError } = useReplayStore();

  const parseFile = async (file: File) => {
    setOpeningSource("file");
    setError(undefined);
    setParsing(true);
    try {
      const parsed = await loader.parse(file, setProgress);
      await saveReplay(parsed, file);
      setTimeline(parsed);
      onOpenReplay(parsed.metadata.id);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Could not open replay.");
    } finally {
      setParsing(false);
      setOpeningSource(undefined);
    }
  };

  const loadSampleReplay = async () => {
    setOpeningSource("sample");
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
      onOpenReplay(parsed.metadata.id);
    } catch (sampleError) {
      setError(sampleError instanceof Error ? sampleError.message : "Sample replay loading failed.");
    } finally {
      setParsing(false);
      setOpeningSource(undefined);
    }
  };

  return (
    <main className="page upload-page">
      <section className="upload-workspace">
        <FileDropzone
          onFile={parseFile}
          disabled={parsing}
          progressStage={openingSource === "file" ? progressStage || "Reading replay file" : undefined}
          progress={progress}
        />
        <div className="upload-sidebar">
          <p className="project-label">Rocket League replay analysis</p>
          <h1>Open a Rocket League replay in a real-time 3D viewer.</h1>
          <p>
            Drop in a replay file to inspect the match, player movement, boost usage, goals, demos, saves, shots, and camera changes
            without sending the file anywhere.
          </p>
          <div className="sample-replay-action">
            <Button variant="secondary" tooltip="Open the bundled sample replay" onClick={loadSampleReplay} disabled={parsing}>
              {openingSource === "sample" ? "Opening sample…" : "Try sample replay"}
            </Button>
            <div>
              <span>No replay handy? Open the bundled match.</span>
              {openingSource === "sample" ? (
                <span className="sample-progress" role="status" aria-live="polite">{progressStage || "Preparing replay viewer"}</span>
              ) : null}
            </div>
          </div>
          <div className="capability-list" aria-label="Project capabilities">
            <span>Stored only in this browser and deletable anytime</span>
            <span>3D cars, ball, boost, scoreboard, and timeline</span>
            <span>Saved replays can be reopened from browser storage</span>
          </div>
        </div>
      </section>
      {error ? <div className="error-box" role="alert">{error}</div> : null}
      {timeline ? (
        <Panel
          title="Last opened replay"
          actions={<Button variant="primary" onClick={() => onOpenReplay(timeline.metadata.id)}>Open viewer</Button>}
        >
          <dl className="metadata-grid replay-summary-grid">
            <div>
              <dt>Name</dt>
              <dd>{timeline.metadata.replayName ?? timeline.metadata.fileName}</dd>
            </div>
            <div>
              <dt>Map</dt>
              <dd>{timeline.metadata.mapName?.toLowerCase() === "cs_p" ? "Champions Field" : timeline.metadata.mapName ?? "Unknown"}</dd>
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
