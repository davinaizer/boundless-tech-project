import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiClient, ModelUsage, StructuredResult } from "./types";

// The only module that calls the model (ADR-005).
export const MODEL = "claude-haiku-5-5";

// Haiku 5.5 thinks adaptively by default at effort "medium". "low" is a
// heuristic for short, latency-sensitive calls; the eval is where it is tuned.
// Changing effort or thinking bumps PROMPT_VERSION (src/services/prompt-version.ts).
const EFFORT = "low";

type MessagesApi = Pick<Anthropic["messages"], "create">;

// No SDK retries: the services own the single retry (ADR-002), and SDK retries
// would multiply both the model calls and the wall-clock time of a timeout.
// The SDK falls back to process.env for any option left undefined, so the
// credential, host and log level are pinned here: only env.ts chooses them.
// ANTHROPIC_CUSTOM_HEADERS is still read by the SDK; it has no option to turn it off.
export function createAnthropicSdk(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    authToken: null,
    baseURL: "https://api.anthropic.com",
    logLevel: "warn",
    maxRetries: 0,
  });
}

// The timeout is our own signal, not the SDK's `timeout` option, so it covers the
// whole call including reading the response body. A timeout counts as a failed
// attempt like any other (architecture: failure modes).
export function createAnthropicClient(
  messages: MessagesApi,
  { timeoutMs }: { timeoutMs: number },
): AiClient {
  return {
    async generateStructured({ system, prompt, schema, maxTokens, signal }) {
      const timeout = AbortSignal.timeout(timeoutMs);
      let message: Anthropic.Message;
      try {
        message = await messages.create(
          {
            model: MODEL,
            max_tokens: maxTokens,
            system,
            messages: [{ role: "user", content: prompt }],
            thinking: { type: "adaptive" },
            output_config: { effort: EFFORT, format: { type: "json_schema", schema } },
          },
          { signal: signal ? AbortSignal.any([signal, timeout]) : timeout },
        );
      } catch (error) {
        // Network, API status and abort errors all mean "no answer". Anything
        // else is a bug in this code and must not be hidden behind the fallback.
        if (error instanceof Anthropic.AnthropicError) {
          return { ok: false, reason: timeout.aborted ? "timeout" : "unavailable" };
        }
        throw error;
      }
      return readResult(message);
    },
  };
}

// Check stop_reason before trusting the JSON (ADR-005).
function readResult(message: Anthropic.Message): StructuredResult {
  const usage: ModelUsage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
  if (message.stop_reason === "refusal") return { ok: false, reason: "refusal", usage };
  // No tools or stop sequences are sent, so any other reason means the output did not finish.
  if (message.stop_reason !== "end_turn") return { ok: false, reason: "truncated", usage };

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  try {
    return { ok: true, data: JSON.parse(text) as unknown, usage };
  } catch {
    return { ok: false, reason: "invalid_json", usage };
  }
}
