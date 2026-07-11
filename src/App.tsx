import { Bug, FolderOpen, MonitorPlay, Upload } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useReplayStore } from "./state/replayStore";
import { Button } from "./ui/Button";
import { TooltipBubble } from "./ui/Tooltip";
import { ReplayLibraryPage } from "./pages/ReplayLibraryPage";
import { UploadPage } from "./pages/UploadPage";

type Page = "upload" | "library" | "replay" | "debug";
const ReplayPage = lazy(() => import("./pages/ReplayPage").then((module) => ({ default: module.ReplayPage })));
const DebugReplayPage = lazy(() => import("./pages/DebugReplayPage").then((module) => ({ default: module.DebugReplayPage })));

export function App() {
  const [page, setPage] = useState<Page>("upload");
  const timeline = useReplayStore((state) => state.timeline);
  const showDebugTools = import.meta.env.DEV;

  return (
    <div className="app">
      <header className="app-header">
        <button type="button" className="brand tooltip-target" onClick={() => setPage("upload")}>
          <span className="brand-dot" aria-hidden="true" />
          <span>Replay</span>
          <TooltipBubble>Return to replay upload</TooltipBubble>
        </button>
        <nav aria-label="Primary navigation">
          <Button
            variant={page === "upload" ? "primary" : "ghost"}
            icon={<Upload size={16} />}
            tooltip="Upload or open a replay file"
            aria-current={page === "upload" ? "page" : undefined}
            onClick={() => setPage("upload")}
          >
            Upload
          </Button>
          <Button
            variant={page === "library" ? "primary" : "ghost"}
            icon={<FolderOpen size={16} />}
            tooltip="Open saved local replays"
            aria-current={page === "library" ? "page" : undefined}
            onClick={() => setPage("library")}
          >
            Library
          </Button>
          {page !== "replay" ? (
            <Button
              variant="ghost"
              icon={<MonitorPlay size={16} />}
              tooltip="View the current replay"
              onClick={() => setPage("replay")}
            >
              Viewer
            </Button>
          ) : null}
          {showDebugTools ? (
            <Button
              variant={page === "debug" ? "primary" : "ghost"}
              icon={<Bug size={16} />}
              tooltip="Inspect replay parser and boost rendering details"
              aria-current={page === "debug" ? "page" : undefined}
              onClick={() => setPage("debug")}
            >
              Debug
            </Button>
          ) : null}
        </nav>
      </header>
      {page === "upload" ? <UploadPage onOpenReplay={() => setPage("replay")} /> : null}
      {page === "library" ? <ReplayLibraryPage onOpenReplay={() => setPage("replay")} onUpload={() => setPage("upload")} /> : null}
      <Suspense fallback={<main className="empty-state">Loading viewer...</main>}>
        {page === "replay" ? (
          <ReplayPage timeline={timeline} onUpload={() => setPage("upload")} onOpenLibrary={() => setPage("library")} />
        ) : null}
        {showDebugTools && page === "debug" ? <DebugReplayPage /> : null}
      </Suspense>
    </div>
  );
}
