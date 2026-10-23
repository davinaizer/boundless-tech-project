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
