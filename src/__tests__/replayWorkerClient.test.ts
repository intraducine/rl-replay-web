import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReplayWorkerClient, type WorkerRequest } from "../replay/ReplayWorkerClient";
import type { ReplayTimeline } from "../replay/types";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  sent: WorkerRequest[] = [];

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: WorkerRequest) {
    this.sent.push(message);
  }

  terminate() {}
}

describe("ReplayWorkerClient", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("defers terminal worker responses out of the browser message handler task", async () => {
    vi.useFakeTimers();
    const client = new ReplayWorkerClient();
    const worker = FakeWorker.instances[0];
    const file = {
      name: "sample.replay",
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1))
    } as File;
    const timeline = {
      version: 1,
      metadata: {
        id: "replay-1",
        fileName: "sample.replay",
        durationSeconds: 0,
        createdAt: 0,
        parserVersion: "test",
        source: "mock",
        players: [],
        teams: []
      },
      frames: [],
      events: []
    } satisfies ReplayTimeline;

    const promise = client.parseTimeline(file);
    await Promise.resolve();
    await Promise.resolve();
    let settled = false;
    promise.then(() => {
      settled = true;
    });

    worker.onmessage?.({
      data: {
        id: worker.sent[0].id,
        type: "timeline-buffer",
        timelineBuffer: new TextEncoder().encode(JSON.stringify(timeline)).buffer
      }
    } as MessageEvent);
    for (let index = 0; index < 5; index++) {
      await Promise.resolve();
    }

    expect(settled).toBe(false);

    vi.runOnlyPendingTimers();
    await Promise.resolve();

    await expect(promise).resolves.toStrictEqual(timeline);
    expect(settled).toBe(true);
  });
});
