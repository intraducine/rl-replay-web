import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLE_REPLAY_FILE_NAME, SAMPLE_REPLAY_PATH } from "../replay/sampleReplay";

describe("sample replay", () => {
  it("commits the public sample replay used by the upload screen", () => {
    expect(existsSync(resolve(process.cwd(), "public", SAMPLE_REPLAY_PATH.slice(1)))).toBe(true);
    expect(SAMPLE_REPLAY_FILE_NAME).toBe("sample-replay.replay");
  });

  it("exposes a sample replay action on the upload screen", () => {
    const uploadPageSource = readFileSync(resolve(process.cwd(), "src/pages/UploadPage.tsx"), "utf8");

    expect(uploadPageSource).toContain("loadSampleReplay");
    expect(uploadPageSource).toContain("Try sample replay");
  });
});
