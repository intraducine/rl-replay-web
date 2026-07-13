import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Group } from "three";
import { useViewerStore } from "../state/viewerStore";
import { setCarBoostActive, setCarSupersonicTrailVisible } from "../viewer/carBoost";

describe("boost rendering toggle", () => {
  it("defaults boost rendering off on startup and exposes a setter", () => {
    expect(useViewerStore.getInitialState().boostRenderingEnabled).toBe(false);
    useViewerStore.getState().setBoostRenderingEnabled(true);
    expect(useViewerStore.getState().boostRenderingEnabled).toBe(true);
    useViewerStore.getState().setBoostRenderingEnabled(false);
    expect(useViewerStore.getState().boostRenderingEnabled).toBe(false);
  });

  it("wires the viewer checkbox to the boost rendering store flag", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");
    expect(source).toContain("boostRenderingEnabled");
    expect(source).toContain("setBoostRenderingEnabled");
    expect(source).toContain('aria-label="Toggle boost rendering"');
    expect(source).toContain("checked={boostRenderingEnabled}");
  });

  it("keeps disabled boost rendering out of the per-frame visual path", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");
    expect(source).toContain("state.boostRenderingEnabled");
    expect(source).toContain("boostRenderingEnabled && carBoostSegmentAt(timeline, id, time)");
    expect(source).toContain("setCarBoostActive(group, boosting, frame, boostRenderingEnabled, time)");
  });

  it("force-hides an already visible boost when rendering is disabled", () => {
    const car = new Group();
    const boost = new Group();
    boost.name = "carBoost";
    boost.visible = true;
    boost.userData.boostActive = true;
    car.add(boost);

    setCarBoostActive(car, false, undefined, false);

    expect(boost.visible).toBe(false);
    expect(boost.userData.boostActive).toBe(false);
  });

  it("passes only speed and replay time to the lightweight effect", () => {
    const car = new Group();
    const boost = new Group();
    boost.name = "carBoost";
    car.add(boost);

    setCarBoostActive(
      car,
      true,
      { position: [0, 0, 0], rotation: [0, 0, 0, 1], velocity: [300, 400, 0] },
      true,
      20.5
    );

    expect(boost.visible).toBe(true);
    expect(boost.userData.speed).toBe(500);
    expect(boost.userData.boostTime).toBe(20.5);
    expect(boost.userData.alphaBoostFlameSpawnAges).toBeUndefined();
    expect(boost.userData.localVelocity).toBeUndefined();
  });

  it("caches the boost and supersonic groups", () => {
    const source = readFileSync(resolve(process.cwd(), "src/viewer/carBoost.ts"), "utf8");
    const car = new Group();
    const boost = new Group();
    const trail = new Group();
    boost.name = "carBoost";
    trail.name = "supersonicTrail";
    car.add(boost, trail);

    setCarBoostActive(car, true);
    setCarSupersonicTrailVisible(car, true);
    setCarSupersonicTrailVisible(car, false);

    expect(car.userData.boostGroup).toBe(boost);
    expect(car.userData.supersonicTrail).toBe(trail);
    expect(trail.visible).toBe(false);
    expect(source).toContain("car.userData.boostGroup");
    expect(source).toContain("car.userData.supersonicTrail");
  });
});
