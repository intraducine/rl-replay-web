import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("viewer chrome layout", () => {
  const styles = () => readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

  it("keeps the player list inside a scrollable side rail", () => {
    const css = styles();

    expect(css).toContain(".viewer-overlay.side");
    expect(css).toContain("top: 136px");
    expect(css).toContain("bottom: 168px");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain(".player-list-scroll");
    expect(css).toContain("height: 100%");
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain("top: clamp(136px, 32vh, 252px)");
  });

  it("uses compact scoreboard columns and aligned viewer controls", () => {
    const css = styles();

    expect(css).toContain("grid-template-columns: 48px minmax(72px, auto) 48px");
    expect(css).toContain(".viewer-control-panel");
    expect(css).toContain("align-items: end");
  });

  it("docks development coordinate controls instead of floating them over the field", () => {
    const css = styles();

    expect(css).toContain(".viewer-overlay.debug");
    expect(css).toContain("left: auto");
    expect(css).toContain("bottom: 168px");
  });
});
