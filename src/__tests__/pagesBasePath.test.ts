import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GitHub Pages base path", () => {
  it("matches the published repository name", () => {
    const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");

    expect(viteConfig).toContain('"/rl-replay-web/"');
    expect(viteConfig).not.toContain('"/rl-replay-viewer/"');
  });
});
