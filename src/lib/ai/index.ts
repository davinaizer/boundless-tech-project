import "server-only";
import { env } from "@/lib/env";
import { createAnthropicClient, createAnthropicSdk } from "./client";
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
  if (env.AI_PROVIDER === "mock") return createMockAiClient();
  // env.ts already rejects this combination; the check narrows the type.
  if (env.ANTHROPIC_API_KEY === undefined) throw new Error("ANTHROPIC_API_KEY is not set");
  return createAnthropicClient(createAnthropicSdk(env.ANTHROPIC_API_KEY).messages, {
    timeoutMs: env.AI_TIMEOUT_MS,
  });
}

let aiClient: AiClient | undefined;

// The one place a provider is chosen (ADR-007): the mock unless AI_PROVIDER is
// "anthropic". Built on first use and reused.
export function getAiClient(): AiClient {
  aiClient ??= createAiClient();
  return aiClient;
}
