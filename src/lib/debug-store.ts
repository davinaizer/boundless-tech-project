import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { DebugCall, DebugEntry } from "@/domain/api";
import { env } from "@/lib/env";

// The development request inspector (ADR-017). Everything here is a no-op unless
// the server runs under `next dev`: there is no flag, so production cannot turn it on.
export const DEBUG_ENTRY_LIMIT = 20;
export const DEBUG_FIELD_LIMIT = 4000;
const CUT_MARK = "…(cut)";

export const isDebugEnabled = () => env.NODE_ENV === "development";

// JSON text of any value, cut to DEBUG_FIELD_LIMIT characters.
export function cut(value: unknown): string {
  const text = typeof value === "string" ? value : (JSON.stringify(value) ?? String(value));
  return text.length > DEBUG_FIELD_LIMIT ? text.slice(0, DEBUG_FIELD_LIMIT) + CUT_MARK : text;
}

type Store = { entries: DebugEntry[]; context: AsyncLocalStorage<DebugEntry> };
const KEY = Symbol.for("benefits-finder.debug-store");

// Held on globalThis, like the model limiter, so route bundles share one buffer.
function store(): Store {
  const holder = globalThis as { [KEY]?: Store };
  holder[KEY] ??= { entries: [], context: new AsyncLocalStorage() };
  return holder[KEY];
}

// Runs `fn` with a new entry as the request's context, so the model and data
// calls made inside it are recorded against it. Outside development it only runs `fn`.
export function withRequest<T>(requestId: string, endpoint: string, fn: () => Promise<T>) {
  if (!isDebugEnabled()) return fn();
  const entry: DebugEntry = { requestId, endpoint, at: new Date().toISOString(), calls: [] };
  const { entries, context } = store();
  entries.unshift(entry);
  entries.splice(DEBUG_ENTRY_LIMIT);
  return context.run(entry, fn);
}

// Adds fields to the current request's entry; nothing outside a request or development.
export function noteRequest(fields: Pick<DebugEntry, "request" | "response" | "log">): void {
  if (!isDebugEnabled()) return;
  const entry = store().context.getStore();
  if (entry) Object.assign(entry, fields);
}

export function recordCall(call: DebugCall): void {
  if (!isDebugEnabled()) return;
  store().context.getStore()?.calls.push(call);
}

export function getDebugEntry(requestId: string): DebugEntry | undefined {
  if (!isDebugEnabled()) return undefined;
  return store().entries.find((entry) => entry.requestId === requestId);
}
