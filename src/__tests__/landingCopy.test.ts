import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("landing page copy and favicon", () => {
  it("uses plain replay-viewer copy instead of parser jargon", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/UploadPage.tsx"), "utf8");

    expect(source).toContain("Open a Rocket League replay in a real-time 3D viewer.");
    expect(source).toContain("Drop in a replay file");
    expect(source).not.toContain("Browser replay parsing");
    expect(source).not.toContain("Rust/WASM parser");
    expect(source).not.toContain('title="Parsing"');
    expect(source).toContain('title="Opening replay"');
  });

  it("ships an actual favicon asset", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const favicon = readFileSync(resolve(process.cwd(), "public/favicon.svg"), "utf8");

    expect(html).toContain('/favicon.svg');
    expect(favicon).toContain("<svg");
  });
});
