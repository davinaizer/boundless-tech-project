import { afterEach, describe, expect, it, vi } from "vitest";
import {
  estimateCostUsd,
  logRequest,
  logRuntimeOnce,
  type RequestLog,
  type RuntimeLog,
} from "./log";

afterEach(() => vi.restoreAllMocks());

describe("estimateCostUsd", () => {
  it("prices input and output tokens per million", () => {
    // 1M input at $0.10 plus 1M output at $0.50
    expect(estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(0.6);
    // 326 * 0.1 / 1e6 + 48 * 0.5 / 1e6 = 0.0000326 + 0.000024
    expect(estimateCostUsd({ inputTokens: 326, outputTokens: 48 })).toBe(0.0000566);
  });

  it("is zero for no usage", () => {
    expect(estimateCostUsd({ inputTokens: 0, outputTokens: 0 })).toBe(0);
  });
});

describe("logRequest", () => {
  it("writes one JSON line to stdout", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const line: RequestLog = {
      requestId: "r1",
      endpoint: "search",
      status: 200,
      outcome: "ok",
      latencyMs: 3,
      promptVersion: "p",
      appVersion: "v",
      provider: "mock",
      model: "none",
      adapter: "in-memory",
      modelCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
    logRequest(line);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0]![0] as string)).toEqual({ event: "request", ...line });
  });
});

describe("logRuntimeOnce", () => {
  const line: RuntimeLog = {
    provider: "anthropic",
    model: "claude-haiku-5-5",
    adapter: "postgres",
    nodeEnv: "production",
    appVersion: "v",
    promptVersion: "p",
    aiTimeoutMs: 8000,
    rateLimitPerMinute: 20,
    apiKeyPresent: true,
  };

  it("writes one runtime line per process, however often it is called", () => {
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("benefits-finder.runtime-logged")];
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logRuntimeOnce(() => line);
    logRuntimeOnce(() => line);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0]![0] as string)).toEqual({ event: "runtime", ...line });
  });
});
