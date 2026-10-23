import type { DebugEntry } from "@/domain/api";
import type { EntryState } from "./debug-entries";
import type { ClientCall } from "./debug-log";

// Pure helpers for the Requests tab (development only, ADR-017).

// The server stores prompts, replies and data inputs as JSON text. Text that is a
// JSON object or array comes back as a value, so it can be shown formatted;
// anything else (a plain query, text cut at the field limit) stays as it is.
export function parseIfJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null ? value : text;
  } catch {
    return text;
  }
}

export type CallGroup = {
  label: string;
  // Oldest first: interpret, search, explain.
  calls: ClientCall[];
  totalMs: number;
};

type FilterBody = {
  filters?: {
    categories?: string[];
    region?: string;
    maxPricePerPerson?: number;
    audience?: string;
    tier?: string;
    keywords?: string[];
  };
};

function filtersLabel(call: ClientCall): string {
  const filters = (call.requestBody as FilterBody | null)?.filters ?? {};
  const parts = [
    ...(filters.categories ?? []),
    filters.region,
    filters.maxPricePerPerson === undefined ? undefined : `£${filters.maxPricePerPerson} a head`,
    filters.audience,
    filters.tier,
    ...(filters.keywords ?? []).map((keyword) => `"${keyword}"`),
  ].filter((part) => part !== undefined);
  return `Filters: ${parts.length > 0 ? parts.join(", ") : "none"}`;
}

function labelOf(first: ClientCall): string {
  if (first.path === "/api/interpret") {
    const query = (first.requestBody as { query?: unknown } | null)?.query;
    return typeof query === "string" ? `"${query}"` : "Query";
  }
  if (first.path === "/api/search") return filtersLabel(first);
  // The calls before it fell off the 20-call log.
  return "Earlier search (partly dropped)";
}

// One group per search the page ran, inferred from the order of calls: a submit
// is interpret, search, explain; a chip edit or a link with filters is search,
// explain. A group starts at each interpret, and at each search when the current
// group already has one. `calls` is newest first, as the log keeps it; groups
// come back newest first.
export function groupCalls(calls: readonly ClientCall[]): CallGroup[] {
  const groups: ClientCall[][] = [];
  for (const call of [...calls].reverse()) {
    const current = groups.at(-1);
    const starts =
      current === undefined ||
      call.path === "/api/interpret" ||
      (call.path === "/api/search" && current.some((c) => c.path === "/api/search"));
    if (starts) groups.push([call]);
    else current.push(call);
  }
  return groups.reverse().map((group) => ({
    label: labelOf(group[0]!),
    calls: group,
    totalMs: group.reduce((sum, call) => sum + call.ms, 0),
  }));
}

// The fields of a request log line the inspector reads; the rest is shown as is.
type LogLine = {
  latencyMs?: number;
  modelCalls?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  source?: string;
  failure?: string;
  groundingRule?: string;
};
const logOf = (entry: DebugEntry) => (entry.log ?? {}) as LogLine;

export type GroupSummary =
  // A record of the group is still loading.
  | { state: "loading" }
  // A record is gone (the server keeps 20), so the totals would be wrong.
  | { state: "unknown" }
  | { state: "known"; modelCalls: number; tokens: number; costUsd: number };

// Model calls, tokens and estimated cost of one search, from its log lines. A
// call that never got a request ID (no answer) made no server record to count.
export function summariseGroup(
  group: CallGroup,
  entries: ReadonlyMap<string, EntryState>,
): GroupSummary {
  let modelCalls = 0;
  let tokens = 0;
  let costUsd = 0;
  let missing = false;
  for (const call of group.calls) {
    if (call.requestId === null) continue;
    const entry = entries.get(call.requestId);
    if (entry === undefined) return { state: "loading" };
    if (entry === "missing") {
      missing = true;
      continue;
    }
    const log = logOf(entry);
    modelCalls += log.modelCalls ?? 0;
    tokens += (log.inputTokens ?? 0) + (log.outputTokens ?? 0);
    costUsd += log.estimatedCostUsd ?? 0;
  }
  return missing ? { state: "unknown" } : { state: "known", modelCalls, tokens, costUsd };
}

// What a row says about the model's answer: the fallback and its reason, or that
// interpret recovered on its retry. Undefined when there is nothing to flag.
export function badgeOf(entry: EntryState | undefined): string | undefined {
  if (entry === undefined || entry === "missing") return undefined;
  const log = logOf(entry);
  if (log.source === "fallback") {
    if (!log.failure) return "fallback";
    const rule = log.groundingRule ? ` (${log.groundingRule})` : "";
    return `fallback · ${log.failure}${rule}`;
  }
  if (log.source === "llm" && (log.modelCalls ?? 0) > 1) return "retried";
  return undefined;
}

export type TimingSplit = { modelMs: number; dataMs: number; otherMs: number; networkMs: number };

// Where one request's time went, as the browser measured it. "Other" is the
// server's time less its model and data calls; "network" is the browser's time
// less the server's. A part below zero (clocks measured apart) is shown as 0.
export function timingSplit(clientMs: number, entry: DebugEntry): TimingSplit {
  const sum = (kind: "model" | "data") =>
    entry.calls.filter((call) => call.kind === kind).reduce((total, call) => total + call.ms, 0);
  const modelMs = sum("model");
  const dataMs = sum("data");
  const serverMs = logOf(entry).latencyMs ?? modelMs + dataMs;
  return {
    modelMs,
    dataMs,
    otherMs: Math.max(0, serverMs - modelMs - dataMs),
    networkMs: Math.max(0, clientMs - serverMs),
  };
}
