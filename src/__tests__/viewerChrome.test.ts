import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("viewer chrome layout", () => {
  const styles = () => readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

  it("keeps the player list inside a scrollable side rail", () => {
    const css = styles();
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(css).toContain("--viewer-edge-top: max(12px, env(safe-area-inset-top, 0px))");
    expect(css).toContain("--viewer-edge-right: max(12px, env(safe-area-inset-right, 0px))");
    expect(css).toContain("--viewer-edge-bottom: max(12px, env(safe-area-inset-bottom, 0px))");
    expect(css).toContain("--viewer-edge-left: max(12px, env(safe-area-inset-left, 0px))");
    expect(css).toContain("--viewer-bottom-rail: calc(204px + var(--viewer-edge-bottom))");
    expect(css).toContain(".viewer-glass-panel");
    expect(css).toContain(".viewer-panel-heading");
    expect(css).toContain("box-shadow: 0 16px 42px rgba(0, 0, 0, 0.26)");
    expect(css).toContain("grid-template-rows: auto auto auto minmax(0, 1fr)");
    expect(css).toContain("width: clamp(292px, 34vw, 430px)");
    expect(css).toContain("width: min(100%, 360px)");
    expect(replayViewerSource).toContain('className="viewer-top-left viewer-glass-panel" aria-label="Match HUD"');
    expect(replayViewerSource).toContain('className="viewer-control-panel viewer-glass-panel" aria-label="Camera and rendering controls"');
    expect(replayViewerSource).toContain('<div className="viewer-panel-heading">');
    expect(replayViewerSource).toContain('<div className="viewer-scoreboard-row">');
    expect(replayViewerSource).toContain('<div className="viewer-metadata-strip">');
    expect(css).toContain(".viewer-top-left .player-list");
    expect(css).toContain("gap: 6px");
    expect(css).toContain(".viewer-top-left .player-list button");
    expect(css).toContain("padding: 8px");
    expect(css).toContain("bottom: var(--viewer-bottom-rail)");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain(".player-list-scroll");
    expect(css).toContain("height: 100%");
    expect(css).toContain("min-height: 0");
    expect(css).toContain("overflow-y: auto");
    expect(css).not.toContain("32vh");
    expect(css).toContain("box-shadow: inset 0 0 0 2px #9df2d0");
    expect(css).toContain(".tooltip-bubble");
    expect(css).toContain("visibility: hidden");
    expect(css).toContain("min-width: 160px");
    expect(css).toContain(".tooltip-target:hover > .tooltip-bubble");
    expect(css).toContain("visibility: visible");
    expect(css).toContain(".viewer-selectors .tooltip-bubble");
    expect(css).toContain("top: calc(100% + 8px)");
  });

  it("uses compact scoreboard columns and aligned viewer controls", () => {
    const css = styles();

    expect(css).toContain("grid-template-columns: 48px minmax(72px, auto) 48px");
    expect(css).toContain(".viewer-control-panel");
    expect(css).toContain("align-items: start");
    expect(css).toContain("width: min(520px, 44vw)");
    expect(css).toContain("grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr) auto");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)");
    expect(css).toContain(".transport-controls");
    expect(css).toContain("grid-column: 2");
    expect(css).toContain(".speed-control");
    expect(css).toContain("grid-column: 3");
    expect(css).toContain("justify-self: start");
    expect(css).toContain(".speed-slider");
    expect(css).toContain(".speed-input");
    expect(css).toContain(".mobile-transport-controls");
    expect(css).toContain("display: none");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(css).toContain(".timeline-shell .slider input");
    expect(css).toContain("margin: -2px 0 0");
  });

  it("docks development coordinate controls instead of floating them over the field", () => {
    const css = styles();

    expect(css).toContain(".viewer-overlay.debug");
    expect(css).toContain("left: auto");
    expect(css).toContain("bottom: var(--viewer-bottom-rail)");
    expect(css).toContain("max-height: calc(100% - var(--viewer-bottom-rail) - var(--viewer-edge-top))");
    expect(css).toContain("overflow-y: auto");
  });

  it("contains mobile viewer chrome inside the viewport width", () => {
    const css = styles();

    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("max-width: 100vw");
    expect(css).toContain("width: 100vw");
    expect(css).toContain("--viewer-bottom-rail: calc(232px + var(--viewer-edge-bottom))");
    expect(css).toContain("left: var(--viewer-edge-left)");
    expect(css).toContain("right: var(--viewer-edge-right)");
    expect(css).toContain("bottom: var(--viewer-bottom-rail)");
    expect(css).toContain("bottom: max(8px, env(safe-area-inset-bottom, 0px))");
    expect(css).toContain(".viewer canvas");
    expect(css).toContain("max-width: 100%");
    expect(css).toContain(".timeline-controls");
    expect(css).toContain("min-width: 0");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("display: grid");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(css).toContain("justify-content: stretch");
    expect(css).toContain("max-height: min(44vh, 330px)");
    expect(css).toContain("justify-content: center");
    expect(css).toContain(".viewer-toggle");
    expect(css).toContain("width: 100%");
    expect(css).toContain(".control-help");
    expect(css).toContain("display: none");
  });

  it("uses dynamic viewport height where supported so mobile browser chrome does not crop the viewer", () => {
    const css = styles();

    expect(css).toContain("@supports (height: 100dvh)");
    expect(css).toContain("min-height: 100dvh");
    expect(css).toContain("min-height: calc(100dvh - 150px)");
    expect(css).toContain("height: min(58dvh, 520px)");
    expect(css).toContain("min-height: calc(100vh - 150px)");
    expect(css).toContain("height: min(58vh, 520px)");
  });

  it("keeps touch playback controls large enough on coarse-pointer devices", () => {
    const css = styles();
    const timelineControls = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(css).toContain("@media (pointer: coarse)");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain(".timeline-shell .slider input[type=\"range\"]");
    expect(css).toContain("min-height: 32px");
    expect(css).toContain(".event-track");
    expect(css).toContain("height: 12px");
    expect(css).toContain(".mobile-transport-controls .button");
    expect(css).toContain("width: 100%");
    expect(css).toContain("min-width: 0");
    expect(timelineControls).toContain('aria-label="Mobile playback controls"');
    expect(timelineControls).toContain('aria-label="Restart replay"');
    expect(timelineControls).toContain('aria-label="Previous frame"');
    expect(timelineControls).toContain('aria-label="Next frame"');
  });
});
