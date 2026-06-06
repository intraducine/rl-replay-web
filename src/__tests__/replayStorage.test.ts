import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { replayLibraryStorageBytes, type StoredReplayRecord } from "../replay/ReplayStorage";

describe("ReplayStorage", () => {
  it("reports replay-library storage instead of total browser origin storage", () => {
    const records = [
      {
        id: "one",
        metadata: {},
        originalReplayBlob: new Blob(["1234"]),
        timelineBlob: new Blob(["123456"]),
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: "two",
        metadata: {},
        timelineBlob: new Blob(["123"]),
        createdAt: 2,
        updatedAt: 2
      }
    ] as StoredReplayRecord[];

    expect(replayLibraryStorageBytes(records)).toBe(13);
  });

  it("clears the replay object store without deleting the IndexedDB database", () => {
    const storageSource = readFileSync(resolve(process.cwd(), "src/replay/ReplayStorage.ts"), "utf8");

    expect(storageSource).toContain('database.clear("replays")');
    expect(storageSource).not.toContain("deleteDB");
  });
});
