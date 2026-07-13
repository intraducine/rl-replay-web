import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("boost debug scene", () => {
  it("exists as an isolated QA scene for the generic effect", () => {
    const scenePath = resolve(process.cwd(), "src/viewer/BoostDebugScene.tsx");
    expect(existsSync(scenePath)).toBe(true);

    const source = readFileSync(scenePath, "utf8");
    expect(source).toContain("export function BoostDebugScene");
    expect(source).toContain("<Canvas");
    expect(source).toContain("setCarBoostActive");
    expect(source).toContain("generic-boost-qa");
  });

  it("is mounted only from the debug page", () => {
    const debugPageSource = readFileSync(resolve(process.cwd(), "src/pages/DebugReplayPage.tsx"), "utf8");
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(debugPageSource).toContain("BoostDebugScene");
    expect(debugPageSource).toContain("Car Boost");
    expect(replayViewerSource).not.toContain("BoostDebugScene");
  });
});
