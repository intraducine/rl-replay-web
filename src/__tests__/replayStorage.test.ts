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

  it("shows local library count, storage, and empty-state context", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/ReplayLibraryPage.tsx"), "utf8");

    expect(source).toContain("library-summary");
    expect(source).toContain("saved replays");
    expect(source).toContain("used");
    expect(source).toContain("No saved replays");
    expect(source).toContain("Upload a replay or open the bundled sample");
  });

  it("clears the active replay when saved replay records are removed", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/ReplayLibraryPage.tsx"), "utf8");

    expect(source).toContain("setTimeline(undefined)");
    expect(source).toContain("timeline?.metadata.id === record.id");
  });
});
