import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("alpha boost debug scene", () => {
  it("exists as a debug-only isolated QA scene", () => {
    const scenePath = resolve(process.cwd(), "src/viewer/AlphaBoostDebugScene.tsx");
    expect(existsSync(scenePath)).toBe(true);

    const source = readFileSync(scenePath, "utf8");
    expect(source).toContain("export function AlphaBoostDebugScene");
    expect(source).toContain("<Canvas");
    expect(source).toContain("setCarAlphaBoostActive");
    expect(source).toContain("render_game_to_text");
  });

  it("is mounted from the debug page and not the production replay viewer", () => {
    const debugPageSource = readFileSync(resolve(process.cwd(), "src/pages/DebugReplayPage.tsx"), "utf8");
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(debugPageSource).toContain("AlphaBoostDebugScene");
    expect(debugPageSource).toContain("Boost Visual QA");
    expect(replayViewerSource).not.toContain("AlphaBoostDebugScene");
  });
});
