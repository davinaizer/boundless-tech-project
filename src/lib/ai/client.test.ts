import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MODEL, createAnthropicClient, createAnthropicSdk } from "./client";
import type { StructuredRequest } from "./types";

const request: StructuredRequest = {
  system: "Return filters.",
  prompt: "cheap cinema in Leeds",
  schema: { type: "object", properties: { keywords: { type: "array" } } },
  maxTokens: 512,
};

function reply(stopReason: string, text: string): Anthropic.Message {
  return {
    stop_reason: stopReason,
    content: [{ type: "text", text, citations: null }],
    usage: { input_tokens: 120, output_tokens: 30 },
  } as unknown as Anthropic.Message;
}

type MessagesApi = Pick<Anthropic["messages"], "create">;

function clientWith(create: unknown, timeoutMs = 5_000) {
  return createAnthropicClient({ create } as unknown as MessagesApi, { timeoutMs });
}

function clientReturning(result: Anthropic.Message | Error) {
  const create = vi.fn(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  );
  return { client: clientWith(create), create };
}

// Like the SDK: never answers, and rejects with an abort error when the signal aborts.
function hangingCreate() {
  return vi.fn(
    (_body: unknown, { signal }: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Anthropic.APIUserAbortError()));
      }),
  );
}

const usage = { inputTokens: 120, outputTokens: 30 };

describe("createAnthropicClient", () => {
  it("returns the parsed JSON and token usage on end_turn", async () => {
    const { client } = clientReturning(reply("end_turn", '{"keywords":["cinema"]}'));
    expect(await client.generateStructured(request)).toEqual({
      ok: true,
      data: { keywords: ["cinema"] },
      usage,
    });
  });

  it("sends one request with the model, schema, low effort and the caller's signal", async () => {
    const { client, create } = clientReturning(reply("end_turn", "{}"));
    const caller = new AbortController();
    await client.generateStructured({ ...request, signal: caller.signal });
    expect(create).toHaveBeenCalledTimes(1);
    // The signal sent is the caller's combined with the timeout, so it follows the caller.
    const sent = (create.mock.calls[0] as unknown as [unknown, { signal: AbortSignal }])[1].signal;
    expect(sent.aborted).toBe(false);
    caller.abort();
    expect(sent.aborted).toBe(true);
    expect(create).toHaveBeenCalledWith(
      {
        model: MODEL,
        max_tokens: 512,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
        thinking: { type: "adaptive" },
        output_config: { effort: "low", format: { type: "json_schema", schema: request.schema } },
      },
      { signal: expect.any(AbortSignal) },
    );
  });

  it("reports a refusal without reading the content", async () => {
    const { client } = clientReturning(reply("refusal", '{"keywords":[]}'));
    expect(await client.generateStructured(request)).toEqual({
      ok: false,
      reason: "refusal",
      usage,
    });
  });

  it("reports truncation on max_tokens and other unfinished stop reasons", async () => {
    for (const stopReason of ["max_tokens", "model_context_window_exceeded", "pause_turn"]) {
      const { client } = clientReturning(reply(stopReason, '{"keyw'));
      expect(await client.generateStructured(request)).toEqual({
        ok: false,
        reason: "truncated",
        usage,
      });
    }
  });

  it("reports malformed JSON", async () => {
    const { client } = clientReturning(reply("end_turn", "not json"));
    expect(await client.generateStructured(request)).toEqual({
      ok: false,
      reason: "invalid_json",
      usage,
    });
  });

  it("reports SDK errors (connection, API status, abort) as unavailable", async () => {
    const errors = [
      new Anthropic.APIConnectionError({ message: "offline" }),
      new Anthropic.APIUserAbortError(),
      Anthropic.APIError.generate(529, undefined, "overloaded", new Headers()),
    ];
    for (const error of errors) {
      const { client } = clientReturning(error);
      expect(await client.generateStructured(request)).toEqual({
        ok: false,
        reason: "unavailable",
      });
    }
  });

  it("aborts a call that runs past the timeout and reports it as timeout", async () => {
    const create = hangingCreate();
    const client = clientWith(create, 20);
    expect(await client.generateStructured(request)).toEqual({ ok: false, reason: "timeout" });
    expect(create.mock.calls[0]?.[1].signal.aborted).toBe(true);
  });

  it("applies the timeout when the caller sends no signal of its own", async () => {
    const client = clientWith(hangingCreate(), 20);
    expect(await client.generateStructured({ ...request, signal: undefined })).toEqual({
      ok: false,
      reason: "timeout",
    });
  });

  it("reports a caller abort as unavailable, not timeout", async () => {
    const client = clientWith(hangingCreate());
    const caller = new AbortController();
    const result = client.generateStructured({ ...request, signal: caller.signal });
    caller.abort();
    expect(await result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("rethrows errors that are not from the SDK", async () => {
    const { client } = clientReturning(new TypeError("bug"));
    await expect(client.generateStructured(request)).rejects.toThrow("bug");
  });
});

describe("createAnthropicSdk", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("turns SDK retries off so the services own the one retry", () => {
    expect(createAnthropicSdk("test-key").maxRetries).toBe(0);
  });

  it("ignores ambient SDK variables for the credential, host and log level", () => {
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "ambient-token");
    vi.stubEnv("ANTHROPIC_BASE_URL", "https://proxy.example.test");
    vi.stubEnv("ANTHROPIC_LOG", "debug");
    const sdk = createAnthropicSdk("test-key");
    expect(sdk.apiKey).toBe("test-key");
    expect(sdk.authToken).toBeNull();
    expect(sdk.baseURL).toBe("https://api.anthropic.com");
    expect(sdk.logLevel).toBe("warn");
  });
});
