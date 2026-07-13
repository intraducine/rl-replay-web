import { useMemo, useState } from "react";
import { ReplayLoader } from "../replay/ReplayLoader";
import { summarizeInspection } from "../replay/ReplayDebug";
import type { ReplayInspection } from "../replay/types";
import { FileDropzone } from "../ui/FileDropzone";
import { Panel } from "../ui/Panel";
import { AlphaBoostDebugScene } from "../viewer/AlphaBoostDebugScene";
import { BoostPadDebugScene } from "../viewer/BoostPadDebugScene";

export function DebugReplayPage() {
  const loader = useMemo(() => new ReplayLoader(), []);
  const [inspection, setInspection] = useState<ReplayInspection>();
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState("Idle");
  const [visualQa, setVisualQa] = useState<"alpha" | "pads">(() =>
    new URLSearchParams(window.location.search).get("qa") === "pads" ? "pads" : "alpha"
  );

  const inspect = async (file: File) => {
    setError(undefined);
    setProgress("Reading replay");
    try {
      setInspection(await loader.inspect(file, (stage) => setProgress(stage)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inspection failed.");
    }
  };

  return (
    <main className="page debug-page">
      <Panel title="Boost Visual QA">
        <div className="debug-visual-tabs" role="tablist" aria-label="Boost visual QA scene">
          <button
            type="button"
            role="tab"
            aria-selected={visualQa === "alpha"}
            className={visualQa === "alpha" ? "selected" : undefined}
            onClick={() => setVisualQa("alpha")}
          >
            Alpha Boost
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={visualQa === "pads"}
            className={visualQa === "pads" ? "selected" : undefined}
            onClick={() => setVisualQa("pads")}
          >
            Boost Pads
          </button>
        </div>
        {visualQa === "alpha" ? <AlphaBoostDebugScene /> : <BoostPadDebugScene />}
      </Panel>
      <FileDropzone onFile={inspect} />
      <Panel title="Inspector">
        <p className="muted">{progress}</p>
        {error ? <div className="error-box">{error}</div> : null}
        {inspection ? (
          <div className="debug-grid">
            <div>
              <h3>Summary</h3>
              <ul>{summarizeInspection(inspection).map((line) => <li key={line}>{line}</li>)}</ul>
              <h3>Warnings</h3>
              <ul>{inspection.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              <h3>Players</h3>
              <ul>{inspection.players.map((player) => <li key={player.id}>{player.name} · team {player.team}</li>)}</ul>
            </div>
            <JsonBlock title="Header" value={inspection.header} />
            <JsonBlock title="Properties" value={inspection.properties} />
            <JsonBlock title="Candidate actors" value={inspection.candidateActors} />
            <ListBlock title="Actor classes" values={inspection.actorClasses} />
            <ListBlock title="Property names" values={inspection.propertyNames} />
          </div>
        ) : null}
      </Panel>
    </main>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section>
      <h3>{title}</h3>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}

function ListBlock({ title, values }: { title: string; values: string[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <pre>{values.join("\n")}</pre>
    </section>
  );
}
