import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { standardArenaBoostPads } from "../replay/standardArenaBoostPads";

describe("standard arena boost pads", () => {
  it("uses the standard 34 pad layout", () => {
    expect(standardArenaBoostPads).toHaveLength(34);
    expect(standardArenaBoostPads.filter((pad) => pad.type === "large")).toHaveLength(6);
    expect(standardArenaBoostPads.filter((pad) => pad.type === "small")).toHaveLength(28);
  });

  it("keeps all pads within a seven-draw instanced budget", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/BoostPads.tsx"), "utf8");

    expect(source).toContain("export const GENERIC_BOOST_PAD_DRAW_CALLS = 7");
    expect((source.match(/new THREE\.InstancedMesh/g) ?? [])).toHaveLength(7);
    expect(source).toContain("THREE.DynamicDrawUsage");
    expect(source).not.toContain("useGLTF");
    expect(source).not.toContain("useTexture");
    expect(source).not.toContain("pointLight");
    expect(source).not.toContain("Billboard");
  });

  it("uses the shared glowing energy language and fades rays upward", () => {
    const padSource = readFileSync(resolve(process.cwd(), "src/viewer/BoostPads.tsx"), "utf8");
    const visualSource = readFileSync(resolve(process.cwd(), "src/viewer/boostVisuals.ts"), "utf8");

    expect(padSource).toContain("createBoostBeamMaterial");
    expect(padSource).toContain("createBoostDiscMaterial");
    expect(padSource).toContain("createBoostOrbMaterial");
    expect(padSource).toContain("ROCKET_LEAGUE_BLOOM_LAYER");
    expect(visualSource).toContain("float upwardFade = pow(1.0 - vHeight, 2.25)");
    expect(visualSource).toContain("#ifdef USE_INSTANCING");
    expect(visualSource).toContain("instanceMatrix * localPosition");
    expect(visualSource).toContain('name: "generic-boost-pad-glow"');
    expect(visualSource).toContain("THREE.AdditiveBlending");
  });

  it("drives pad depletion and respawn from replay-derived pickups", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/BoostPads.tsx"), "utf8");

    expect(source).toContain("inferBoostPadPickups(timeline)");
    expect(source).toContain("boostPadPlaybackStateAt(pad, pickupsByPad.get(pad.id), currentTime)");
    expect(source).toContain('name="rocket-league-boost-pads"');
  });
});
