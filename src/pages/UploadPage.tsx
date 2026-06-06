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
      <section className="portfolio-hero">
        <div>
          <p className="project-label">Rocket League replay analysis</p>
          <h1>Browser replay parsing with a real-time 3D match viewer.</h1>
          <p>
            Upload a Rocket League replay file to parse match metadata, player movement, boost usage, goals, demos, and camera state
            locally in the browser.
          </p>
        </div>
        <FileDropzone onFile={parseFile} />
      </section>
      <section className="capability-strip" aria-label="Project capabilities">
        <div>
          <strong>Rust/WASM parser</strong>
          <span>Replay parsing runs off the main thread in a Web Worker.</span>
        </div>
        <div>
          <strong>Three.js playback</strong>
          <span>Cars, ball physics, boost pads, scoreboard, nameplates, and timeline controls.</span>
        </div>
        <div>
          <strong>Private by default</strong>
          <span>Files stay local, and parsed timelines can be saved in browser storage.</span>
        </div>
      </section>
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
