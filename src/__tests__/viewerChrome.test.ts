import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("viewer chrome layout", () => {
  const styles = () => readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

  it("keeps the field dominant with independent broadcast overlays", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(css).toContain("--bottom-rail: 174px");
    expect(css).toContain(".broadcast-scoreboard");
    expect(css).toContain("left: 50%");
    expect(css).toContain(".camera-dock");
    expect(css).toContain("grid-template-columns: repeat(3, auto)");
    expect(source).toContain('className="broadcast-scoreboard"');
    expect(source).toContain('className="camera-dock" aria-label="Camera and rendering controls"');
    expect(source).toContain('className={`selected-player-hud ${teamClassName(selectedPlayer.team)}`}');
  });

  it("puts the full roster in an accessible slide-out drawer", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(css).toContain(".roster-drawer");
    expect(css).toContain("transform: translateX(-102%)");
    expect(css).toContain(".roster-drawer.open");
    expect(css).toContain("overflow-y: auto");
    expect(source).toContain('aria-expanded={rosterOpen}');
    expect(source).toContain('aria-hidden={!rosterOpen} inert={!rosterOpen}');
    expect(source).toContain("<PlayerList timeline={timeline}");
  });

  it("uses a cinematic event rail and centered transport controls", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(css).toContain(".timeline-controls");
    expect(css).toContain(".timeline-line");
    expect(css).toContain(".transport-controls");
    expect(css).toContain("grid-column: 2");
    expect(css).toContain(".speed-select");
    expect(source).toContain('aria-label="Replay event markers"');
    expect(source).toContain('aria-label="Playback speed"');
    expect(source).toContain('tooltip="Play or pause replay"');
  });

  it("keeps the viewer usable on narrow and touch viewports", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/TimelineControls.tsx"), "utf8");

    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(css).toContain(".mobile-transport-controls");
    expect(css).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(css).toContain("@media (pointer: coarse)");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("min-height: calc(100dvh - 93px)");
    expect(source).toContain('aria-label="Mobile playback controls"');
  });

  it("provides visible keyboard focus and reduced-motion behavior", () => {
    const css = styles();

    expect(css).toContain("outline: 3px solid var(--cyan)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition-duration: .01ms !important");
  });
});
