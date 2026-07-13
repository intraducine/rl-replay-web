import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { standardArenaBoostPads } from "../replay/standardArenaBoostPads";

describe("standard arena boost pads", () => {
  it("uses the standard 34 pad layout", () => {
    expect(standardArenaBoostPads).toHaveLength(34);
    expect(standardArenaBoostPads.filter((pad) => pad.type === "large")).toHaveLength(6);
    expect(standardArenaBoostPads.filter((pad) => pad.type === "small")).toHaveLength(28);
  });

  it("includes the documented big boost locations", () => {
    expect(standardArenaBoostPads.filter((pad) => pad.type === "large").map((pad) => pad.position)).toEqual([
      [-3072, -4096, 8],
      [3072, -4096, 8],
      [-3584, 0, 8],
      [3584, 0, 8],
      [-3072, 4096, 8],
      [3072, 4096, 8]
    ]);
  });

  it("renders extracted Rocket League pad meshes instead of primitive placeholders", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/BoostPads.tsx"), "utf8");

    expect(source).toContain("BoostPad_Small_02_SM.gltf");
    expect(source).toContain("BoostPad_Large.gltf");
    expect(source).toContain("BoostPad_Large_Glow.gltf");
    expect(source).toContain("BoostPad_Scroll_SM.gltf");
    expect(source).toContain("BoostPad_Small_D.dds");
    expect(source).toContain("BoostPad_Large_D.dds");
    expect(source).toContain("DDSLoader");
    expect(source).toContain("ROCKET_LEAGUE_BLOOM_LAYER");
    expect(source).not.toContain("CylinderGeometry");
    expect(source).not.toContain("TorusGeometry");
  });

  it("drives pad depletion and respawn from replay-derived pickups", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/BoostPads.tsx"), "utf8");

    expect(source).toContain("inferBoostPadPickups(timeline)");
    expect(source).toContain("boostPadPlaybackStateAt(pad, pickups, currentTime)");
    expect(source).toContain('name="rocket-league-boost-pads"');
  });
});
