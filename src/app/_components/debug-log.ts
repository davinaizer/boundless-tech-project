// The browser half of the development request inspector (ADR-017): the last
// calls this page made, with their bodies. Off until /api/health reports
// `debug: true`, so a production page records nothing.
export const DEBUG_LOG_LIMIT = 20;

export type ClientCall = {
  path: string;
  requestBody: unknown;
  // null when the request never got an answer.
  status: number | null;
  ms: number;
  responseBody: unknown;
  requestId: string | null;
};

let enabled = false;
let calls: readonly ClientCall[] = [];
const listeners = new Set<() => void>();
const NONE: readonly ClientCall[] = [];

export function enableDebugLog(): void {
  enabled = true;
}

export function recordClientCall(call: ClientCall): void {
  if (!enabled) return;
  calls = [call, ...calls].slice(0, DEBUG_LOG_LIMIT);
  for (const listener of listeners) listener();
}

// The three arguments of useSyncExternalStore.
export function subscribeDebugLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const debugLogSnapshot = () => calls;
export const debugLogServerSnapshot = () => NONE;
