import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../ui/Button";

describe("Button tooltip support", () => {
  it("renders a hover tooltip from the shared button API", () => {
    const { container } = render(<Button tooltip="Open saved replays">Library</Button>);

    expect(container.querySelector(".button.tooltip-target")).not.toBeNull();
    expect(container.querySelector(".tooltip-bubble")?.textContent).toBe("Open saved replays");
  });
});
