import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Group } from "three";
import { useViewerStore } from "../state/viewerStore";
import { setCarAlphaBoostActive } from "../viewer/carAlphaBoost";

describe("boost rendering toggle", () => {
  it("defaults boost rendering on and exposes a setter", () => {
    useViewerStore.getState().setBoostRenderingEnabled(true);

    expect(useViewerStore.getState().boostRenderingEnabled).toBe(true);

    useViewerStore.getState().setBoostRenderingEnabled(false);

    expect(useViewerStore.getState().boostRenderingEnabled).toBe(false);
  });

  it("wires the viewer checkbox to the boost rendering store flag", () => {
    const replayViewerSource = readFileSync(resolve(process.cwd(), "src/viewer/ReplayViewer.tsx"), "utf8");

    expect(replayViewerSource).toContain("boostRenderingEnabled");
    expect(replayViewerSource).toContain("setBoostRenderingEnabled");
    expect(replayViewerSource).toContain('aria-label="Toggle boost rendering"');
    expect(replayViewerSource).toContain("checked={boostRenderingEnabled}");
    expect(replayViewerSource).toContain("setBoostRenderingEnabled(event.currentTarget.checked)");
  });

  it("keeps disabled boost rendering out of the per-frame car visual path", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("state.boostRenderingEnabled");
    expect(sceneRootSource).toContain("setCarAlphaBoostActive(group, boosting, frame, boostRenderingEnabled, time, flameDistanceWindow, flameSpawnAges, alphaBoostEmitterAge)");
    expect(sceneRootSource).toContain("setCarSupersonicTrailVisible(group, boostRenderingEnabled && Boolean(frame.supersonic) && !boosting)");
  });

  it("force-hides an already visible boost group when rendering is disabled", () => {
    const car = new Group();
    const boost = new Group();
    boost.name = "alphaBoost";
    boost.visible = true;
    boost.userData.alphaBoostActive = true;
    boost.userData.boostMeshFade = 1;
    car.add(boost);

    setCarAlphaBoostActive(car, false, undefined, false);

    expect(boost.visible).toBe(false);
    expect(boost.userData.alphaBoostActive).toBe(false);
    expect(boost.userData.boostMeshFade).toBe(0);
  });

  it("passes replay time into the alpha boost group for deterministic particle animation", () => {
    const car = new Group();
    const boost = new Group();
    boost.name = "alphaBoost";
    car.add(boost);

    setCarAlphaBoostActive(car, true, undefined, true, 20.5);

    expect(boost.userData.alphaBoostTime).toBe(20.5);
  });

  it("passes replay distance into the alpha boost group for SpawnPerUnit particles", () => {
    const car = new Group();
    const boost = new Group();
    boost.name = "alphaBoost";
    car.add(boost);

    setCarAlphaBoostActive(car, true, undefined, true, 20.5, 128);

    expect(boost.userData.alphaBoostFlameDistanceWindow).toBe(128);
  });

  it("passes replay SpawnPerUnit ages into the alpha boost group", () => {
    const car = new Group();
    const boost = new Group();
    boost.name = "alphaBoost";
    car.add(boost);

    setCarAlphaBoostActive(car, true, undefined, true, 20.5, 128, [0.1, 0.2]);

    expect(boost.userData.alphaBoostFlameSpawnAges).toEqual([0.1, 0.2]);
  });

  it("passes replay-backed emitter age into the alpha boost group", () => {
    const car = new Group();
    const boost = new Group();
    boost.name = "alphaBoost";
    car.add(boost);

    setCarAlphaBoostActive(car, true, undefined, true, 20.5, 128, [0.1, 0.2], 0.35);

    expect(boost.userData.alphaBoostEmitterAge).toBe(0.35);
  });
});
