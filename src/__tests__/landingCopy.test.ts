import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("landing page copy and favicon", () => {
  it("uses plain replay-viewer copy instead of parser jargon", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/UploadPage.tsx"), "utf8");

    expect(source).toContain("Open a Rocket League replay in a real-time 3D viewer.");
    expect(source).toContain("Drop in a replay file");
    expect(source).toContain("upload-workspace");
    expect(source).toContain("capability-list");
    expect(source).not.toContain("Browser replay parsing");
    expect(source).not.toContain("Rust/WASM parser");
    expect(source).not.toContain("Last parsed replay");
    expect(source).toContain('title="Last opened replay"');
    expect(source).not.toContain('title="Parsing"');
    expect(source).toContain('title="Opening replay"');
  });

  it("uses plain progress and error messages while opening replays", () => {
    const loaderSource = readFileSync(resolve(process.cwd(), "src/replay/ReplayLoader.ts"), "utf8");
    const workerSource = readFileSync(resolve(process.cwd(), "src/replay-worker/replayWorker.ts"), "utf8");

    expect(loaderSource).toContain("Reading replay file");
    expect(workerSource).toContain("Preparing replay viewer");
    expect(workerSource).toContain("Building replay timeline");
    expect(workerSource).toContain("Replay could not be opened.");
    expect(workerSource).not.toContain("Loading WASM parser");
    expect(workerSource).not.toContain("Replay parsing failed.");
  });

  it("ships an actual favicon asset", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const favicon = readFileSync(resolve(process.cwd(), "public/favicon.svg"), "utf8");

    expect(html).toContain('/favicon.svg');
    expect(favicon).toContain("<svg");
  });
});
