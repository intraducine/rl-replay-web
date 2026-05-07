import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("playback clock contract", () => {
  it("keeps smooth scene playback on one clock instead of a separate overlay rAF loop", () => {
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(replayViewerSource).not.toContain("requestAnimationFrame(tick)");
    expect(sceneRootSource).toContain("lastPublishedPlaybackTime");
    expect(sceneRootSource).not.toContain("Math.abs(state.currentTime - playbackTime.current) > 0.35");
  });
});
