import { describe, expect, it } from "vitest";
import { routeFromHash, routeHash } from "../navigation/route";

describe("app routes", () => {
  it("maps empty and unknown hashes to upload", () => {
    expect(routeFromHash("")).toEqual({ page: "upload" });
    expect(routeFromHash("#/anything-else")).toEqual({ page: "upload" });
  });

  it("round-trips saved replay ids through an encoded URL", () => {
    const hash = routeHash({ page: "replay", replayId: "match/id with spaces" });

    expect(hash).toBe("#/replay/match%2Fid%20with%20spaces");
    expect(routeFromHash(hash)).toEqual({ page: "replay", replayId: "match/id with spaces" });
  });

  it("supports the other top-level destinations", () => {
    expect(routeFromHash("#/library")).toEqual({ page: "library" });
    expect(routeFromHash("#/debug")).toEqual({ page: "debug" });
    expect(routeHash({ page: "upload" })).toBe("#/upload");
  });
});
