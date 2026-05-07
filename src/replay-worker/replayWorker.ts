import { createMockMetadata, createMockTimeline } from "../replay/mockReplay";
import { emptyInspectionWarning } from "../replay/ReplayDebug";
import { prepareTimelineForTransfer } from "../replay/ReplayTransfer";
import type { WorkerRequest, WorkerResponse } from "../replay/ReplayWorkerClient";

type WasmParser = {
  default?: () => Promise<unknown>;
  parse_replay_metadata?: (bytes: Uint8Array, fileName?: string) => unknown;
  parse_replay_timeline?: (bytes: Uint8Array, fileName?: string) => unknown;
  inspect_replay?: (bytes: Uint8Array, fileName?: string) => unknown;
};

let wasmPromise: Promise<WasmParser | undefined> | undefined;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    post({ id: request.id, type: "progress", stage: "Worker received replay", progress: 0.1 });
    const bytes = new Uint8Array(request.fileBuffer);
    const wasm = await loadWasm(request.id);

    if (request.type === "parse-metadata") {
      const metadata = wasm?.parse_replay_metadata
        ? wasm.parse_replay_metadata(bytes, request.fileName)
        : createMockMetadata(request.fileName);
      post({ id: request.id, type: "metadata", metadata: metadata as never });
      return;
    }

    if (request.type === "inspect") {
      const inspection = wasm?.inspect_replay
        ? wasm.inspect_replay(bytes, request.fileName)
        : emptyInspectionWarning("WASM parser is not built locally; showing mock inspector fallback.");
      post({ id: request.id, type: "inspection", inspection: inspection as never });
      return;
    }

    post({ id: request.id, type: "progress", stage: "Extracting replay timeline", progress: 0.55 });
    const timeline = wasm?.parse_replay_timeline
      ? wasm.parse_replay_timeline(bytes, request.fileName)
      : createMockTimeline(request.fileName);
    const timelineBuffer = new TextEncoder().encode(JSON.stringify(prepareTimelineForTransfer(timeline as never))).buffer;
    post({ id: request.id, type: "timeline-buffer", timelineBuffer }, [timelineBuffer]);
  } catch (error) {
    post({
      id: request.id,
      type: "error",
      message: error instanceof Error ? error.message : "Replay parsing failed.",
      details: error
    });
  }
};

async function loadWasm(id: string): Promise<WasmParser | undefined> {
  if (!wasmPromise) {
    wasmPromise = import(/* @vite-ignore */ "../../crates/replay_parser/pkg/replay_parser.js")
      .then(async (module: WasmParser) => {
        post({ id, type: "progress", stage: "Loading WASM parser", progress: 0.25 });
        await module.default?.();
        return module;
      })
      .catch(() => undefined);
  }

  return wasmPromise;
}

function post(message: WorkerResponse, transfer?: Transferable[]) {
  (self as DedicatedWorkerGlobalScope).postMessage(message, transfer ?? []);
}
