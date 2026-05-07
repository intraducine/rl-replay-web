import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app shell", () => {
  it("declares a favicon so browsers do not request a missing /favicon.ico", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('rel="icon"');
  });
});
