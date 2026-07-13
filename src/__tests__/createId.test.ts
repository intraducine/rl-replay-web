import { describe, expect, it } from "vitest";
import { createId } from "../utils/createId";

describe("createId", () => {
  it("uses randomUUID when it is available", () => {
    expect(createId({
      randomUUID: () => "00000000-0000-4000-8000-000000000000",
      getRandomValues: (array) => array
    })).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("creates an RFC 4122-shaped id when randomUUID is unavailable", () => {
    const id = createId({
      getRandomValues: (array) => {
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(1);
        return array;
      }
    });

    expect(id).toMatch(/^01010101-0101-4101-8101-010101010101$/);
  });
});
