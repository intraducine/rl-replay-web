import { afterEach, describe, expect, it } from "vitest";
import { alphaBoostBloomEnabled, alphaBoostComponentEnabled } from "../viewer/alphaBoostDebugFlags";

describe("alpha boost debug render flags", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __rlAlphaBoostDebug?: unknown }).__rlAlphaBoostDebug;
  });

  it("leaves all alpha boost components enabled by default", () => {
    expect(alphaBoostComponentEnabled("mesh")).toBe(true);
    expect(alphaBoostComponentEnabled("flame")).toBe(true);
    expect(alphaBoostComponentEnabled("main")).toBe(true);
    expect(alphaBoostComponentEnabled("lensFlare")).toBe(true);
    expect(alphaBoostComponentEnabled("lensFlareReflection")).toBe(true);
    expect(alphaBoostBloomEnabled("mesh")).toBe(true);
    expect(alphaBoostBloomEnabled("flame")).toBe(true);
    expect(alphaBoostBloomEnabled("main")).toBe(true);
  });

  it("allows browser QA to disable individual alpha boost components", () => {
    (globalThis as typeof globalThis & { __rlAlphaBoostDebug?: unknown }).__rlAlphaBoostDebug = {
      components: {
        mesh: false,
        main: false
      }
    };

    expect(alphaBoostComponentEnabled("mesh")).toBe(false);
    expect(alphaBoostComponentEnabled("main")).toBe(false);
    expect(alphaBoostComponentEnabled("flame")).toBe(true);
  });

  it("allows browser QA to disable bloom per alpha boost component", () => {
    (globalThis as typeof globalThis & { __rlAlphaBoostDebug?: unknown }).__rlAlphaBoostDebug = {
      bloom: {
        mesh: false
      }
    };

    expect(alphaBoostBloomEnabled("mesh")).toBe(false);
    expect(alphaBoostBloomEnabled("flame")).toBe(true);
  });
});
