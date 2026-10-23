import { describe, expect, it } from "vitest";
import { describeRuntime } from "./runtime-info";

describe("describeRuntime", () => {
  it("names the AI provider and model and the data adapter, from the environment alone", () => {
    expect(describeRuntime()).toEqual({
      ai: { provider: "mock", model: "none" },
      data: { adapter: "in-memory" },
    });
  });
});
