import { describe, expect, it } from "vitest";
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
});
