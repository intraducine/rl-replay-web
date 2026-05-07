import type { Vec3 } from "./types";

export type BoostPad = {
  id: number;
  position: Vec3;
  type: "small" | "large";
};

export const standardArenaBoostPads: BoostPad[] = [
  { id: 0, type: "small", position: [0, -4240, 0.082] },
  { id: 1, type: "small", position: [-1792, -4184, 0.082] },
  { id: 2, type: "small", position: [1792, -4184, 0.082] },
  { id: 3, type: "large", position: [-3072, -4096, 8] },
  { id: 4, type: "large", position: [3072, -4096, 8] },
  { id: 5, type: "small", position: [-940, -3308, 0.082] },
  { id: 6, type: "small", position: [940, -3308, 0.082] },
  { id: 7, type: "small", position: [0, -2816, 0.082] },
  { id: 8, type: "small", position: [-3584, -2484, 0.082] },
  { id: 9, type: "small", position: [3584, -2484, 0.082] },
  { id: 10, type: "small", position: [-1788, -2302, 0.082] },
  { id: 11, type: "small", position: [1788, -2302, 0.082] },
  { id: 12, type: "small", position: [-2048, -1036, 0.082] },
  { id: 13, type: "small", position: [2048, -1036, 0.082] },
  { id: 14, type: "small", position: [0, -1024, 0.082] },
  { id: 15, type: "large", position: [-3584, 0, 8] },
  { id: 16, type: "small", position: [-1024, 0, 0.082] },
  { id: 17, type: "small", position: [1024, 0, 0.082] },
  { id: 18, type: "large", position: [3584, 0, 8] },
  { id: 19, type: "small", position: [0, 1024, 0.082] },
  { id: 20, type: "small", position: [-2048, 1036, 0.082] },
  { id: 21, type: "small", position: [2048, 1036, 0.082] },
  { id: 22, type: "small", position: [-1788, 2302, 0.082] },
  { id: 23, type: "small", position: [1788, 2302, 0.082] },
  { id: 24, type: "small", position: [-3584, 2484, 0.082] },
  { id: 25, type: "small", position: [3584, 2484, 0.082] },
  { id: 26, type: "small", position: [0, 2816, 0.082] },
  { id: 27, type: "small", position: [-940, 3308, 0.082] },
  { id: 28, type: "small", position: [940, 3308, 0.082] },
  { id: 29, type: "large", position: [-3072, 4096, 8] },
  { id: 30, type: "large", position: [3072, 4096, 8] },
  { id: 31, type: "small", position: [-1792, 4184, 0.082] },
  { id: 32, type: "small", position: [1792, 4184, 0.082] },
  { id: 33, type: "small", position: [0, 4240, 0.082] }
];
