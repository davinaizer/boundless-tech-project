import { describe, expect, it } from "vitest";
import { ADD_BUTTON, focusAfterRemoval } from "./focus";

describe("focusAfterRemoval", () => {
  const ids = ["category:dining", "region", "price"];

  it("moves to the next chip", () => {
    expect(focusAfterRemoval(ids, "category:dining")).toBe("region");
    expect(focusAfterRemoval(ids, "region")).toBe("price");
  });

  it("moves to the previous chip when the last one is removed", () => {
    expect(focusAfterRemoval(ids, "price")).toBe("region");
  });

  it("moves to the add button when no chip is left or the chip is unknown", () => {
    expect(focusAfterRemoval(["region"], "region")).toBe(ADD_BUTTON);
    expect(focusAfterRemoval(ids, "nope")).toBe(ADD_BUTTON);
  });
});
