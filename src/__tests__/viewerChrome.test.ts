import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("viewer chrome layout", () => {
  const styles = () => readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

  it("keeps the player list inside a scrollable side rail", () => {
    const css = styles();

    expect(css).toContain("grid-template-rows: auto auto minmax(0, 1fr)");
    expect(css).toContain("width: clamp(280px, 36vw, 420px)");
    expect(css).toContain("bottom: 190px");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain(".player-list-scroll");
    expect(css).toContain("height: 100%");
    expect(css).toContain("min-height: 0");
    expect(css).toContain("overflow-y: auto");
    expect(css).not.toContain("32vh");
    expect(css).toContain("box-shadow: inset 0 0 0 2px #9df2d0");
    expect(css).toContain(".tooltip-bubble");
    expect(css).toContain("visibility: hidden");
    expect(css).toContain(".tooltip-target:hover > .tooltip-bubble");
    expect(css).toContain("visibility: visible");
  });

  it("uses compact scoreboard columns and aligned viewer controls", () => {
    const css = styles();

    expect(css).toContain("grid-template-columns: 48px minmax(72px, auto) 48px");
    expect(css).toContain(".viewer-control-panel");
    expect(css).toContain("align-items: end");
    expect(css).toContain("grid-template-columns: 1fr auto 1fr");
    expect(css).toContain(".transport-controls");
    expect(css).toContain("grid-column: 2");
    expect(css).toContain(".speed-control");
    expect(css).toContain("grid-column: 3");
    expect(css).toContain(".speed-slider");
    expect(css).toContain(".speed-input");
    expect(css).toContain(".mobile-transport-controls");
    expect(css).toContain("display: none");
  });

  it("docks development coordinate controls instead of floating them over the field", () => {
    const css = styles();

    expect(css).toContain(".viewer-overlay.debug");
    expect(css).toContain("left: auto");
    expect(css).toContain("bottom: 190px");
    expect(css).toContain("overflow-y: auto");
  });
});
