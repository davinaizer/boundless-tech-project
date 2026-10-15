import { describe, expect, it } from "vitest";
import { createLatest } from "./latest";

describe("createLatest", () => {
  it("aborts the earlier request when a new one begins", () => {
    const latest = createLatest();
    const first = latest.begin();
    const second = latest.begin();
    expect(first.signal.aborted).toBe(true);
    expect(first.isCurrent()).toBe(false);
    expect(second.signal.aborted).toBe(false);
    expect(second.isCurrent()).toBe(true);
  });
});
