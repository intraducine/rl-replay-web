import { describe, expect, it } from "vitest";
import { rlPositionToThree, rlQuatToThree, transformRigidBodyToThree } from "../math/coordinateSystem";

describe("coordinate conversion", () => {
  it("maps Rocket League Z-up coordinates into Three.js Y-up coordinates", () => {
    expect(rlPositionToThree([100, 200, 300])).toEqual([100, 300, -200]);
  });

  it("maps Rocket League Z-axis yaw into Three.js Y-axis yaw", () => {
    expect(rlQuatToThree([0, 0, 0.7071, 0.7071])).toEqual([0, 0.7071, -0, 0.7071]);
  });

  it("applies debug axis inversions after the base conversion", () => {
    const frame = transformRigidBodyToThree(
      { position: [1, 2, 3], rotation: [0.1, 0.2, 0.3, 0.4] },
      { invertX: true, invertZ: true, invertQuatW: true }
    );

    expect(frame.position).toEqual([-1, 3, 2]);
    expect(frame.rotation).toEqual([0.1, 0.3, -0.2, -0.4]);
  });
});
