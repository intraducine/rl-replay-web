import { Activity, Bug, FolderOpen, Upload } from "lucide-react";
import { useState } from "react";
import { useReplayStore } from "./state/replayStore";
import { Button } from "./ui/Button";
import { DebugReplayPage } from "./pages/DebugReplayPage";
import { ReplayLibraryPage } from "./pages/ReplayLibraryPage";
import { ReplayPage } from "./pages/ReplayPage";
import { UploadPage } from "./pages/UploadPage";

type Page = "upload" | "library" | "replay" | "debug";

export function App() {
  const [page, setPage] = useState<Page>("upload");
  const timeline = useReplayStore((state) => state.timeline);

  return (
    <div className="app">
      <header className="app-header">
        <button className="brand" onClick={() => setPage("upload")}>
          <Activity size={22} />
          <span>RL Replay Viewer</span>
        </button>
        <nav>
          <Button variant={page === "upload" ? "primary" : "ghost"} icon={<Upload size={16} />} onClick={() => setPage("upload")}>
            Upload
          </Button>
          <Button variant={page === "library" ? "primary" : "ghost"} icon={<FolderOpen size={16} />} onClick={() => setPage("library")}>
            Library
          </Button>
          <Button variant={page === "replay" ? "primary" : "ghost"} onClick={() => setPage("replay")}>
            Viewer
          </Button>
          <Button variant={page === "debug" ? "primary" : "ghost"} icon={<Bug size={16} />} onClick={() => setPage("debug")}>
            Debug
          </Button>
        </nav>
      </header>
      {page === "upload" ? <UploadPage onOpenReplay={() => setPage("replay")} /> : null}
      {page === "library" ? <ReplayLibraryPage onOpenReplay={() => setPage("replay")} /> : null}
      {page === "replay" ? <ReplayPage timeline={timeline} /> : null}
      {page === "debug" ? <DebugReplayPage /> : null}
    </div>
  );
}
