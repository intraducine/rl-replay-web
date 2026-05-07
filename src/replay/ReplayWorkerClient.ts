import type { ReplayInspection, ReplayMetadata, ReplayTimeline } from "./types";

export type WorkerRequest =
  | { id: string; type: "parse-metadata"; fileBuffer: ArrayBuffer; fileName?: string }
  | { id: string; type: "parse-timeline"; fileBuffer: ArrayBuffer; fileName?: string }
  | { id: string; type: "inspect"; fileBuffer: ArrayBuffer; fileName?: string };

export type WorkerResponse =
  | { id: string; type: "progress"; stage: string; progress?: number }
  | { id: string; type: "metadata"; metadata: ReplayMetadata }
  | { id: string; type: "timeline"; timeline: ReplayTimeline }
  | { id: string; type: "timeline-buffer"; timelineBuffer: ArrayBuffer }
  | { id: string; type: "inspection"; inspection: ReplayInspection }
  | { id: string; type: "error"; message: string; details?: unknown };

type ProgressHandler = (stage: string, progress?: number) => void;

export class ReplayWorkerClient {
  private worker: Worker;
  private pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
      onProgress?: ProgressHandler;
    }
  >();

  constructor() {
    this.worker = new Worker(new URL("../replay-worker/replayWorker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handleMessage(event.data);
  }

  parseMetadata(file: File, onProgress?: ProgressHandler): Promise<ReplayMetadata> {
    return this.requestFile("parse-metadata", file, onProgress);
  }

  parseTimeline(file: File, onProgress?: ProgressHandler): Promise<ReplayTimeline> {
    return this.requestFile("parse-timeline", file, onProgress);
  }

  inspect(file: File, onProgress?: ProgressHandler): Promise<ReplayInspection> {
    return this.requestFile("inspect", file, onProgress);
  }

  terminate() {
    this.worker.terminate();
    this.pending.clear();
  }

  private async requestFile<T>(
    type: WorkerRequest["type"],
    file: File,
    onProgress?: ProgressHandler
  ): Promise<T> {
    if (!file.name.toLowerCase().endsWith(".replay")) {
      throw new Error("Select a Rocket League .replay file.");
    }

    const id = crypto.randomUUID();
    const fileBuffer = await file.arrayBuffer();

    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, onProgress });
    });

    this.worker.postMessage({ id, type, fileBuffer, fileName: file.name }, [fileBuffer]);
    return promise;
  }

  private handleMessage(message: WorkerResponse) {
    const request = this.pending.get(message.id);
    if (!request) return;

    if (message.type === "progress") {
      request.onProgress?.(message.stage, message.progress);
      return;
    }

    this.pending.delete(message.id);
    window.setTimeout(() => {
      if (message.type === "error") {
        request.reject(Object.assign(new Error(message.message), { details: message.details }));
      } else if (message.type === "metadata") {
        request.resolve(message.metadata);
      } else if (message.type === "timeline") {
        request.resolve(message.timeline);
      } else if (message.type === "timeline-buffer") {
        request.resolve(JSON.parse(new TextDecoder().decode(message.timelineBuffer)) as ReplayTimeline);
      } else {
        request.resolve(message.inspection);
      }
    }, 0);
  }
}
