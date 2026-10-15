import "server-only";
import type { AiClient, StructuredRequest, StructuredResult } from "./types";

export type MockResponder = (
  request: StructuredRequest,
) => StructuredResult | Promise<StructuredResult>;

export type MockAiClient = AiClient & { readonly calls: StructuredRequest[] };

// With no responder the mock answers like an unreachable model, so the services
// take their fallback path. The e2e answers are in canned.ts, passed in by index.ts.
const unavailable: MockResponder = () => ({ ok: false, reason: "unavailable" });

export function createMockAiClient(responder: MockResponder = unavailable): MockAiClient {
  const calls: StructuredRequest[] = [];
  return {
    calls,
    async generateStructured(request) {
      calls.push(request);
      return responder(request);
    },
  };
}
