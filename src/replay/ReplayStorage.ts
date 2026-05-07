import { deleteDB, openDB, type DBSchema } from "idb";
import type { ReplayMetadata, ReplayTimeline } from "./types";

export type StoredReplayRecord = {
  id: string;
  metadata: ReplayMetadata;
  originalReplayBlob?: Blob;
  timelineBlob: Blob;
  createdAt: number;
  updatedAt: number;
};

interface ReplayDb extends DBSchema {
  replays: {
    key: string;
    value: StoredReplayRecord;
    indexes: {
      "by-updated": number;
    };
  };
}

const DB_NAME = "rl-replay-viewer";
const DB_VERSION = 1;

async function db() {
  return openDB<ReplayDb>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore("replays", { keyPath: "id" });
      store.createIndex("by-updated", "updatedAt");
    }
  });
}

export async function saveReplay(timeline: ReplayTimeline, originalReplayBlob?: Blob): Promise<StoredReplayRecord> {
  const now = Date.now();
  const record: StoredReplayRecord = {
    id: timeline.metadata.id,
    metadata: timeline.metadata,
    originalReplayBlob,
    timelineBlob: new Blob([JSON.stringify(timeline)], { type: "application/json" }),
    createdAt: timeline.metadata.createdAt || now,
    updatedAt: now
  };

  const database = await db();
  await database.put("replays", record);
  return record;
}

export async function listReplays(): Promise<StoredReplayRecord[]> {
  const database = await db();
  const records = await database.getAllFromIndex("replays", "by-updated");
  return records.reverse();
}

export async function loadReplay(id: string): Promise<ReplayTimeline | undefined> {
  const database = await db();
  const record = await database.get("replays", id);
  if (!record) return undefined;
  return JSON.parse(await record.timelineBlob.text()) as ReplayTimeline;
}

export async function deleteReplay(id: string): Promise<void> {
  const database = await db();
  await database.delete("replays", id);
}

export async function clearReplays(): Promise<void> {
  await deleteDB(DB_NAME);
}

export async function estimateStorageUsage(): Promise<StorageEstimate | undefined> {
  return navigator.storage?.estimate ? navigator.storage.estimate() : undefined;
}
