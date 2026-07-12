import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("viewer chrome layout", () => {
  const styles = () => readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

  it("keeps the field dominant with independent broadcast overlays", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(css).toContain("--bottom-rail: 198px");
    expect(css).toContain(".broadcast-scoreboard");
    expect(css).toContain("left: 50%");
    expect(css).toContain(".camera-dock");
    expect(css).toContain("grid-template-columns: 120px 78px 116px");
    expect(css).toContain(".camera-value");
    expect(css).toContain(".camera-segment select { position: absolute; inset: 0;");
    expect(source).toContain('className="broadcast-scoreboard"');
    expect(source).toContain('className="camera-dock" aria-label="Camera and rendering controls"');
    expect(source).toContain('className="camera-value" aria-hidden="true"');
    expect(source).toContain('className={`selected-player-hud ${teamClassName(selectedPlayer.team)}`}');
    expect(source).not.toContain("<span>Following</span>");
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
    expect(css).toContain(".speed-value");
    expect(source).toContain('aria-label="Replay event markers"');
    expect(source).toContain('aria-label="Playback speed"');
    expect(source).toContain('className="speed-value" aria-hidden="true"');
    expect(source).toContain('tooltip="Play or pause replay"');
    expect(source).toContain("Rewind");
    expect(source).toContain("FastForward");
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
    expect(css).toContain("min-height: 100dvh");
    expect(source).toContain('aria-label="Mobile playback controls"');
  });

  it("renders a live circular boost meter and a separate red ball-cam warning", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(source).toContain("CircularProgressbar");
    expect(source).toContain("value={selectedBoostValue}");
    expect(source).toContain("circleRatio={0.76}");
    expect(source).toContain('className="ball-cam-warning"');
    expect(source).not.toContain("ball-cam-indicator");
    expect(css).toContain(".CircularProgressbar-path");
    expect(css).toContain("stroke-dashoffset 100ms linear");
    expect(css).toContain(".ball-cam-warning");
    expect(css).toContain("color: #ff6a53");
  });

  it("floats the replay header over the field like the selected reference", () => {
    const css = styles();
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

    expect(css).toContain(".app:has(.viewer) .app-header");
    expect(css).toContain("backdrop-filter: blur(14px)");
    expect(css).toContain("border-radius: 14px");
    expect(app).toContain('page !== "replay"');
  });

  it("uses the selected reference's director-first replay state and segmented scoreboard", () => {
    const store = readFileSync(resolve(process.cwd(), "src/state/viewerStore.ts"), "utf8");
    const scoreboard = readFileSync(resolve(process.cwd(), "src/viewer/Scoreboard.tsx"), "utf8");

    expect(store).toContain('cameraMode: "director"');
    expect(scoreboard).toContain('className="clock-score-pips"');
    expect(scoreboard).toContain('className="blue"');
    expect(scoreboard).toContain('className="orange"');
  });

  it("provides visible keyboard focus and reduced-motion behavior", () => {
    const css = styles();

    expect(css).toContain("outline: 3px solid var(--cyan)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition-duration: .01ms !important");
  });
});
