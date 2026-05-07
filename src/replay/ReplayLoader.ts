import { ReplayWorkerClient } from "./ReplayWorkerClient";
import type { ReplayInspection, ReplayMetadata, ReplayTimeline } from "./types";

export class ReplayLoader {
  private client = new ReplayWorkerClient();

  async parse(file: File, onProgress?: (stage: string, progress?: number) => void): Promise<ReplayTimeline> {
    onProgress?.("Reading replay", 0.05);
    return this.client.parseTimeline(file, onProgress);
  }

  metadata(file: File, onProgress?: (stage: string, progress?: number) => void): Promise<ReplayMetadata> {
    return this.client.parseMetadata(file, onProgress);
  }

  inspect(file: File, onProgress?: (stage: string, progress?: number) => void): Promise<ReplayInspection> {
    return this.client.inspect(file, onProgress);
  }

  dispose() {
    this.client.terminate();
  }
}
