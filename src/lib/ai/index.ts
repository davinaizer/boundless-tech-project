import "server-only";
import { cut, isDebugEnabled, recordCall } from "@/lib/debug-store";
import { env } from "@/lib/env";
import { cannedResponder } from "./canned";
import { MODEL, createAnthropicClient, createAnthropicSdk } from "./client";
import { createMockAiClient } from "./mock";
import type { AiClient } from "./types";

export type {
  AiClient,
  ModelUsage,
  StructuredFailure,
  StructuredRequest,
  StructuredResult,
} from "./types";

function createAiClient(): AiClient {
  if (env.AI_PROVIDER === "mock") return createMockAiClient(cannedResponder);
  // env.ts already rejects this combination; the check narrows the type.
  if (env.ANTHROPIC_API_KEY === undefined) throw new Error("ANTHROPIC_API_KEY is not set");
  return createAnthropicClient(createAnthropicSdk(env.ANTHROPIC_API_KEY).messages, {
    timeoutMs: env.AI_TIMEOUT_MS,
  });
}

// In development each call is recorded for the request inspector (ADR-017).
// Results and errors pass through unchanged.
function withDebug(client: AiClient): AiClient {
  return {
    async generateStructured(request) {
      const started = performance.now();
      const ms = () => Math.round(performance.now() - started);
      const prompt = cut(request.prompt);
      try {
        const result = await client.generateStructured(request);
        recordCall({
          kind: "model",
          ms: ms(),
          prompt,
          ok: result.ok,
          reply: result.ok ? cut(result.data) : result.reason,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
        });
        return result;
      } catch (error) {
        const name = error instanceof Error ? error.name : "unknown";
        recordCall({
          kind: "model",
          ms: ms(),
          prompt,
          ok: false,
          reply: "",
          inputTokens: 0,
          outputTokens: 0,
          error: name,
        });
        throw error;
      }
    },
  };
}

let aiClient: AiClient | undefined;

// The one place a provider is chosen (ADR-007): the mock unless AI_PROVIDER is
// "anthropic". Built on first use and reused.
export function getAiClient(): AiClient {
  aiClient ??= isDebugEnabled() ? withDebug(createAiClient()) : createAiClient();
  return aiClient;
}

// What the running server uses, for the log and the health check. Read from env
// only: it builds no client, so asking never costs a call.
export function describeAi(): { provider: "anthropic" | "mock"; model: string } {
  return env.AI_PROVIDER === "anthropic"
    ? { provider: "anthropic", model: MODEL }
    : { provider: "mock", model: "none" };
}
