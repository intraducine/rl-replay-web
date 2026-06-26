import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReplayTimeline } from "../replay/types";
import { LOW_POLY_DEMO_PART_COUNTS, demoExplosionInstances } from "../viewer/DemoExplosions";

const timeline: ReplayTimeline = {
  version: 1,
  metadata: {
    id: "demo-test",
    fileName: "demo-test.replay",
    durationSeconds: 20,
    createdAt: 0,
    parserVersion: "test",
    players: [
      { id: "attacker", name: "Attacker", team: 0 },
      { id: "victim", name: "Victim", team: 1 }
    ]
  },
  frames: [
    {
      t: 9.9,
      cars: {
        attacker: { position: [0, 20, 0], rotation: [0, 0, 0, 1] },
        victim: { position: [1200, 35, -800], rotation: [0, 0, 0, 1] }
      }
    },
    {
      t: 10.0,
      cars: {
        attacker: { position: [20, 20, 0], rotation: [0, 0, 0, 1] },
        victim: { position: [1210, 35, -790], rotation: [0, 0, 0, 1], demolished: true }
      }
    },
    {
      t: 10.7,
      cars: {
        attacker: { position: [100, 20, 0], rotation: [0, 0, 0, 1] }
      }
    }
  ],
  events: [{ type: "demo", t: 10.0, attackerId: "attacker", victimId: "victim", label: "Demo" }]
};

describe("demo explosion reconstruction", () => {
  it("places the explosion at the victim car position before demolition removes the car", () => {
    const [instance] = demoExplosionInstances(timeline, 10.25);

    expect(instance.id).toBe("demo-0-10-victim-attacker");
    expect(instance.age).toBeCloseTo(0.25);
    expect(instance.position[0]).toBeCloseTo(1200);
    expect(instance.position[1]).toBeCloseTo(35);
    expect(instance.position[2]).toBeCloseTo(-800);
    expect(instance.team).toBe(1);
  });

  it("expires demo explosion instances after the effect window", () => {
    expect(demoExplosionInstances(timeline, 12)).toEqual([]);
  });

  it("builds active demo explosion instances in one pass", () => {
    const source = readFileSyncForTest("src/viewer/DemoExplosions.tsx");
    const instanceSource = source.match(/export function demoExplosionInstances[\s\S]*?\n}\n\nexport function DemoExplosions/)?.[0] ?? "";

    expect(instanceSource).toContain("const instances: DemoExplosionInstance[] = []");
    expect(instanceSource).toContain("for (const model of demoExplosionModels(timeline))");
    expect(instanceSource).toContain("instances.push({");
    expect(instanceSource).not.toContain(".filter((instance)");
    expect(instanceSource).not.toContain(".map(({ t:");
  });

  it("mounts the demo explosion layer from the replay scene", () => {
    const sceneRootSource = readFileSyncForTest("src/viewer/SceneRoot.tsx");

    expect(sceneRootSource).toContain("DemoExplosions");
    expect(sceneRootSource).toContain("playbackTimeRef={playbackTime}");
  });

  it("uses a low-poly demolition made from geometry instead of texture sprites", () => {
    const source = readFileSyncForTest("src/viewer/DemoExplosions.tsx");

    expect(LOW_POLY_DEMO_PART_COUNTS.debrisChunks).toBeGreaterThanOrEqual(14);
    expect(LOW_POLY_DEMO_PART_COUNTS.smokeChunks).toBeGreaterThanOrEqual(12);
    expect(LOW_POLY_DEMO_PART_COUNTS.coreChunks).toBeGreaterThanOrEqual(5);
    expect(LOW_POLY_DEMO_PART_COUNTS.shockRings).toBe(0);
    expect(source).toContain("demo-low-poly-debris");
    expect(source).toContain("demo-low-poly-smoke");
    expect(source).toContain("demo-low-poly-core");
    expect(source).toContain("boxGeometry");
    expect(source).toContain("dodecahedronGeometry");
    expect(source).toContain("icosahedronGeometry");
    expect(source).toContain("flatShading");
    expect(source).not.toContain("demo-low-poly-shock-ring");
    expect(source).not.toContain("torusGeometry");
    expect(source).not.toContain("useTexture");
    expect(source).not.toContain("spriteMaterial");
    expect(source).not.toContain("Electricity_Mat");
  });

  it("builds demo explosion models in one pass with cached player teams", () => {
    const source = readFileSyncForTest("src/viewer/DemoExplosions.tsx");
    const modelBuilderSource = source.match(/function demoExplosionModels[\s\S]*?\n}\n\nfunction demoExplosionModel/)?.[0] ?? "";

    expect(source).toContain("const demoExplosionModelCache = new WeakMap<ReplayTimeline, DemoExplosionModel[]>()");
    expect(modelBuilderSource).toContain("const cached = demoExplosionModelCache.get(timeline)");
    expect(modelBuilderSource).toContain("if (cached) return cached");
    expect(modelBuilderSource).toContain("const models: DemoExplosionModel[] = []");
    expect(modelBuilderSource).toContain("const teamByPlayer = new Map<string, 0 | 1>()");
    expect(modelBuilderSource).toContain("for (const player of timeline.metadata.players)");
    expect(modelBuilderSource).toContain("teamByPlayer.set(player.id, player.team)");
    expect(modelBuilderSource).toContain("for (const event of timeline.events)");
    expect(modelBuilderSource).toContain("demoExplosionModelCache.set(timeline, models)");
    expect(modelBuilderSource).not.toContain(".filter((event)");
    expect(modelBuilderSource).not.toContain(".map((event");
    expect(modelBuilderSource).not.toContain("timeline.metadata.players.map");
    expect(source).not.toContain("timeline.metadata.players.find");
  });
});

function readFileSyncForTest(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}
