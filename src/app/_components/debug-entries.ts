import type { DebugEntry } from "@/domain/api";
import { debugEntryRequest } from "./api-client";

// The server's records of this page's requests (development only, ADR-017),
// fetched once per request ID and kept: a record does not change after its
// response has arrived. A 404 or a failed fetch is kept as "missing".
export type EntryState = DebugEntry | "missing";

let entries: ReadonlyMap<string, EntryState> = new Map();
const pending = new Set<string>();
const listeners = new Set<() => void>();
const NONE: ReadonlyMap<string, EntryState> = new Map();

function store(requestId: string, state: EntryState): void {
  pending.delete(requestId);
  entries = new Map(entries).set(requestId, state);
  for (const listener of listeners) listener();
}

export function loadDebugEntry(requestId: string): void {
  if (entries.has(requestId) || pending.has(requestId)) return;
  pending.add(requestId);
  debugEntryRequest(requestId, new AbortController().signal).then(
    (entry) => store(requestId, entry),
    () => store(requestId, "missing"),
  );
}

// The three arguments of useSyncExternalStore.
export function subscribeDebugEntries(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const debugEntriesSnapshot = () => entries;
export const debugEntriesServerSnapshot = () => NONE;
