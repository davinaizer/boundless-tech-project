import { describe, expect, it } from "vitest";
import { createMockAiClient } from "./mock";
import type { StructuredRequest, StructuredResult } from "./types";

const request: StructuredRequest = { system: "s", prompt: "p", schema: {}, maxTokens: 64 };

describe("createMockAiClient", () => {
  it("answers like an unreachable model by default", async () => {
    expect(await createMockAiClient().generateStructured(request)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("plays scripted results in order and records each request", async () => {
    const script: StructuredResult[] = [
      { ok: false, reason: "invalid_json" },
      { ok: true, data: { keywords: ["spa"] }, usage: { inputTokens: 1, outputTokens: 1 } },
    ];
    const mock = createMockAiClient(() => script.shift()!);
    expect(await mock.generateStructured(request)).toEqual({ ok: false, reason: "invalid_json" });
    expect(await mock.generateStructured(request)).toMatchObject({ ok: true });
    expect(mock.calls).toEqual([request, request]);
  });
});
