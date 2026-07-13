import { Bug, FolderOpen, MonitorPlay, Upload } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { routeFromHash, routeHash, type AppRoute, type Page } from "./navigation/route";
import { loadReplay } from "./replay/ReplayStorage";
import { useReplayStore } from "./state/replayStore";
import { Button } from "./ui/Button";
import { TooltipBubble } from "./ui/Tooltip";
import { ReplayLibraryPage } from "./pages/ReplayLibraryPage";
import { UploadPage } from "./pages/UploadPage";

const ReplayPage = lazy(() => import("./pages/ReplayPage").then((module) => ({ default: module.ReplayPage })));
const DebugReplayPage = lazy(() => import("./pages/DebugReplayPage").then((module) => ({ default: module.DebugReplayPage })));

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => routeFromHash(window.location.hash));
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string>();
  const timeline = useReplayStore((state) => state.timeline);
  const setTimeline = useReplayStore((state) => state.setTimeline);
  const showDebugTools = import.meta.env.DEV;
  const page = route.page;

  const navigate = useCallback((nextPage: Page, replayId?: string) => {
    const nextRoute = { page: nextPage, replayId: nextPage === "replay" ? replayId : undefined } satisfies AppRoute;
    const nextHash = routeHash(nextRoute);
    if (window.location.hash === nextHash) setRoute(nextRoute);
    else window.location.hash = nextHash;
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${routeHash({ page: "upload" })}`);
    }
    const syncRoute = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const replayId = route.page === "replay" ? route.replayId : undefined;

    if (!replayId || timeline?.metadata.id === replayId) {
      setRouteLoading(false);
      setRouteError(undefined);
      return () => {
        cancelled = true;
      };
    }

    setRouteLoading(true);
    setRouteError(undefined);
    void loadReplay(replayId)
      .then((savedTimeline) => {
        if (cancelled) return;
        if (!savedTimeline) {
          setRouteError("This saved replay is no longer available in this browser.");
          return;
        }
        setTimeline(savedTimeline);
      })
      .catch((loadError) => {
        if (!cancelled) setRouteError(loadError instanceof Error ? loadError.message : "This saved replay could not be opened.");
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [route.page, route.replayId, setTimeline, timeline?.metadata.id]);

  const routeTimeline = route.page === "replay" && route.replayId && timeline?.metadata.id !== route.replayId ? undefined : timeline;

  return (
    <div className="app">
      <header className="app-header">
        <button type="button" className="brand tooltip-target" onClick={() => navigate("upload")}>
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
            onClick={() => navigate("upload")}
          >
            Upload
          </Button>
          <Button
            variant={page === "library" ? "primary" : "ghost"}
            icon={<FolderOpen size={16} />}
            tooltip="Open saved local replays"
            aria-current={page === "library" ? "page" : undefined}
            onClick={() => navigate("library")}
          >
            Library
          </Button>
          <Button
            variant={page === "replay" ? "primary" : "ghost"}
            icon={<MonitorPlay size={16} />}
            tooltip="View the current replay"
            aria-current={page === "replay" ? "page" : undefined}
            onClick={() => navigate("replay", timeline?.metadata.id)}
          >
            Viewer
          </Button>
          {showDebugTools ? (
            <Button
              variant={page === "debug" ? "primary" : "ghost"}
              icon={<Bug size={16} />}
              tooltip="Inspect replay parser and boost rendering details"
              aria-current={page === "debug" ? "page" : undefined}
              onClick={() => navigate("debug")}
            >
              Debug
            </Button>
          ) : null}
        </nav>
      </header>
      {page === "upload" ? <UploadPage onOpenReplay={(id) => navigate("replay", id)} /> : null}
      {page === "library" ? <ReplayLibraryPage onOpenReplay={(id) => navigate("replay", id)} onUpload={() => navigate("upload")} /> : null}
      <Suspense fallback={<main className="empty-state">Loading viewer...</main>}>
        {page === "replay" ? (
          <ReplayPage
            timeline={routeTimeline}
            loading={routeLoading}
            error={routeError}
            onUpload={() => navigate("upload")}
            onOpenLibrary={() => navigate("library")}
          />
        ) : null}
        {showDebugTools && page === "debug" ? <DebugReplayPage /> : null}
      </Suspense>
    </div>
  );
}
