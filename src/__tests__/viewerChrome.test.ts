import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("viewer chrome layout", () => {
  const styles = () => readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

  it("keeps the field in a dedicated viewport above the independent timeline component", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(css).toContain("--bottom-rail: 198px");
    expect(css).toContain("grid-template-rows: minmax(0, 1fr) var(--bottom-rail)");
    expect(css).toContain(".viewer-stage { position: relative;");
    expect(css).toContain(".viewer-timeline { position: relative;");
    expect(css).toContain(".broadcast-scoreboard");
    expect(css).toContain("left: 50%");
    expect(css).toContain(".camera-dock");
    expect(css).toContain("grid-template-columns: repeat(3, 132px)");
    expect(css).toContain(".camera-segment.boost:has(input:checked)");
    expect(css).toContain(".camera-value");
    expect(css).toContain(".camera-segment select { position: absolute; inset: 0;");
    expect(css).toContain("overflow: visible; border: 1px solid var(--line); border-radius: 12px");
    expect(css).toContain(".camera-segment.current, .camera-segment.player");
    expect(css).toContain("background: transparent; }");
    expect(css).toContain(".scoreboard .blue > span { transform: translateX(6px); }");
    expect(css).toContain(".scoreboard .orange > span { transform: translateX(-6px); }");
    expect(source).toContain('className="broadcast-scoreboard"');
    expect(source).toContain('className="viewer-stage" aria-label="3D replay viewport"');
    expect(source).toContain('className="viewer-timeline" aria-label="Replay timeline and playback controls"');
    expect(source).not.toContain('className="viewer-overlay bottom"');
    expect(source).toContain('className="camera-dock" aria-label="Camera and rendering controls"');
    expect(source).toContain('className="camera-value" aria-hidden="true"');
    expect(source).toContain('data-active={boostRenderingEnabled ? "true" : "false"}');
    expect(source).toContain('className={`selected-player-hud ${teamClassName(selectedPlayer.team)}`}');
    expect(source).not.toContain("<span>Following</span>");
  });

  it("puts the full roster in an accessible slide-out drawer", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(css).toContain(".roster-drawer");
    expect(css).toContain("background: rgba(5, 14, 21, .98)");
    expect(css).toContain(".match-metadata-bar > .metadata-pill");
    expect(css).toContain("transform: translateX(-102%)");
    expect(css).toContain(".roster-drawer.open");
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain(".roster-tab { position: absolute; z-index: 8; top: 50%");
    expect(css).toContain("transform: translateY(-50%)");
    expect(css).toContain(".roster-heading button { display: grid; align-self: center;");
    expect(css).toContain(".player-list button.selected.blue");
    expect(css).toContain(".player-list button.selected.orange");
    expect(css).toContain(".player-list meter::-webkit-meter-optimum-value");
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
    expect(css).toContain(".transport-controls .button { min-width: 56px; width: 56px; height: 56px;");
    expect(css).toContain(".speed-select { position: relative; grid-column: 3; justify-self: end; display: grid; place-items: center; width: max-content; min-width: 72px; height: 56px;");
    expect(css).toContain(".seek-value { display: inline-block; width: auto; height: auto;");
    expect(css).toContain(".event-marker-tooltip");
    expect(source).toContain("Use left and right arrow keys to move between events");
    expect(css).toContain(".timeline-scrubber { position: relative; display: block; height: 42px;");
    expect(css).toContain(".event-track { position: absolute;");
    expect(css).toContain("width: 24px; height: 24px");
    expect(css).toContain(".event-track button::after");
    expect(css).toContain("top: 25px");
    expect(source).toContain('aria-label="Playback speed"');
    expect(source).toContain('className="speed-value" aria-hidden="true"');
    expect(source).toContain('className="seek-value"');
    expect(source).toContain('<strong>{event.typeLabel}</strong>');
    expect(source).not.toContain('title={`${event.details} · ${formatTime(event.t)}`}');
    expect(source).not.toContain('tooltip="Play or pause replay"');
    expect(source).toContain("Rewind");
    expect(source).toContain("FastForward");
    expect(source).toContain("event-hover-card");
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
    expect(css).toContain("top: calc(var(--viewer-edge) + 84px)");
    expect(css).toContain("right: var(--viewer-edge)");
    expect(css).toContain("text-align: right");
    expect(css).toContain(".ball-cam-warning[data-active=\"true\"]");
    expect(css).toContain("translateX(18px)");
    expect(css).toContain("@keyframes ball-cam-dot-blink");
    expect(css).toContain("animation: ball-cam-dot-blink 1s steps(1, end) infinite");
    expect(source).toContain('data-active={ballCamActive}');
    expect(source).toContain('className="ball-cam-dot"');
    expect(css).toContain(".ball-cam-warning { position: absolute;");
    expect(css).toContain("display: inline-flex; align-items: center;");
    expect(source).toContain("<strong>Ball cam</strong>");
  });

  it("floats the replay header over the field like the selected reference", () => {
    const css = styles();
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

    expect(css).toContain(".app:has(.viewer) .app-header");
    expect(css).toContain("backdrop-filter: blur(14px)");
    expect(css).toContain("border-radius: 12px");
    expect(app).toContain('aria-current={page === "replay" ? "page" : undefined}');
    expect(app).not.toContain('page !== "replay"');
  });

  it("keeps viewer chrome outlines hover-only while preserving keyboard focus", () => {
    const css = styles();

    expect(css).toContain(".app:has(.viewer) .app-header nav .button { flex: 1;");
    expect(css).toContain("border-color: transparent");
    expect(css).toContain(".app:has(.viewer) .app-header nav .button:hover:not(:disabled)");
    expect(css).toContain(".upload-page { display: grid; align-content: start;");
    expect(css).toContain(".debug-page { display: grid;");
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain("height: 100vh;");
  });

  it("opens replay in player cam with a centered scoreboard", () => {
    const store = readFileSync(resolve(process.cwd(), "src/state/viewerStore.ts"), "utf8");
    const scoreboard = readFileSync(resolve(process.cwd(), "src/viewer/Scoreboard.tsx"), "utf8");

    expect(store).toContain('cameraMode: "player"');
    expect(scoreboard).not.toContain('className="clock-score-pips"');
    expect(scoreboard).toContain('<div className="clock">');
    expect(scoreboard).toContain('className="team blue"');
    expect(scoreboard).toContain('className="team orange"');
  });

  it("shows a compact bottom-left control guide only in free camera mode", () => {
    const css = styles();
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(source).toContain('cameraMode === "free"');
    expect(source).toContain('className="free-cam-help" aria-label="Free camera controls"');
    expect(source).toContain('<kbd>WASD</kbd> Move');
    expect(source).toContain('<kbd>Mouse</kbd> Look');
    expect(source).toContain('<kbd>Q / E</kbd> Down / up');
    expect(source).toContain('selectedPlayer && cameraMode !== "free"');
    expect(source).toContain('cameraModeOptions.filter((option) => option.value !== "free")');
    expect(source).toContain('cameraMode === "free" && !compactPointerLayout');
    expect(css).toContain(".free-cam-help");
  });

  it("provides visible keyboard focus and reduced-motion behavior", () => {
    const css = styles();

    expect(css).toContain("outline: 3px solid var(--cyan)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition-duration: .01ms !important");
  });

  it("uses rounded typography, straight player accents, and a single spacing scale", () => {
    const css = styles();

    expect(css).toContain('--font-ui: ui-rounded, "SF Pro Rounded", "Avenir Next"');
    expect(css).toContain("font-family: var(--font-ui)");
    expect(css).toContain("--space-5: 24px");
    expect(css).toContain(".selected-player-hud {");
    expect(css).toContain("border-radius: 0 10px 10px 0");
    expect(css).not.toContain("clip-path: polygon(0 0, 91% 0, 100% 100%, 0 100%)");
    expect(css).toContain(".player-list button { display: grid;");
    expect(css).toContain("border-radius: 0");
    expect(css).toContain("overflow-x: clip");
  });
});
