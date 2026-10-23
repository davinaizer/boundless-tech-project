"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { DebugEntry } from "@/domain/api";
import { debugEntryRequest, isAbort } from "./api-client";
import { groupCalls, parseIfJson } from "./debug-groups";
import {
  debugLogServerSnapshot,
  debugLogSnapshot,
  subscribeDebugLog,
  type ClientCall,
} from "./debug-log";

// Development only (ADR-017): this page's last calls, and for the selected one
// the server's record of the model and data calls behind it.

// "llm" or "fallback" from an interpret or explain answer; search has none.
function sourceOf(call: ClientCall): string {
  const body = call.responseBody as {
    source?: unknown;
    explanations?: { source?: unknown }[];
  } | null;
  if (typeof body?.source === "string") return body.source;
  if (Array.isArray(body?.explanations)) {
    return body.explanations.some((line) => line.source === "llm") ? "llm" : "fallback";
  }
  return "–";
}

const pretty = (value: unknown) =>
  typeof value === "string" ? value : (JSON.stringify(value, null, 2) ?? "");

function Block({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="mt-2">
      <p className="text-sm font-bold text-muted">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-tile bg-white px-3 py-2 text-sm break-all whitespace-pre-wrap">
        {pretty(value)}
      </pre>
    </div>
  );
}

type ServerSide = DebugEntry | "loading" | "missing";

function ServerDetail({ requestId }: { requestId: string }) {
  const [entry, setEntry] = useState<ServerSide>("loading");

  useEffect(() => {
    const controller = new AbortController();
    debugEntryRequest(requestId, controller.signal).then(setEntry, (error: unknown) => {
      if (!isAbort(error)) setEntry("missing");
    });
    return () => controller.abort();
  }, [requestId]);

  if (entry === "loading") return <p className="mt-2 text-muted">Loading the server record…</p>;
  if (entry === "missing") {
    return <p className="mt-2 text-muted">No server record (it keeps the last 20).</p>;
  }
  return (
    <>
      {entry.log && <Block label="Log line" value={entry.log} />}
      {entry.calls.length === 0 && <p className="mt-2 text-muted">No model or data calls.</p>}
      {entry.calls.map((call, index) =>
        call.kind === "model" ? (
          <div key={index} className="mt-3">
            <p className="font-bold">
              Model call {index + 1}: {call.ok ? "ok" : "failed"}, {call.ms} ms, {call.inputTokens}{" "}
              in / {call.outputTokens} out{call.error ? `, threw ${call.error}` : ""}
            </p>
            <Block label="Prompt" value={parseIfJson(call.prompt)} />
            <Block label="Reply" value={parseIfJson(call.reply)} />
          </div>
        ) : (
          <div key={index} className="mt-3">
            <p className="font-bold">
              Data call {index + 1}: {call.method}, {call.rows} rows, {call.ms} ms
              {call.error ? `, threw ${call.error}` : ""}
            </p>
            <Block label="Input" value={parseIfJson(call.input)} />
          </div>
        ),
      )}
    </>
  );
}

export function RequestsView() {
  const calls = useSyncExternalStore(subscribeDebugLog, debugLogSnapshot, debugLogServerSnapshot);
  const [selected, setSelected] = useState<ClientCall | null>(null);

  if (calls.length === 0) {
    return <p className="text-muted">No requests yet. Run a search.</p>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-3">
        {groupCalls(calls).map((group) => (
          <section key={`${group.calls[0]!.requestId ?? "none"}-${group.label}`}>
            <h3 className="font-heading text-base font-bold break-words text-ink">{group.label}</h3>
            <p className="text-sm text-muted">
              {group.calls.length} {group.calls.length === 1 ? "call" : "calls"}, {group.totalMs} ms
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {group.calls.map((call, index) => (
                <li key={`${call.requestId ?? "none"}-${index}`}>
                  <button
                    type="button"
                    aria-pressed={selected === call}
                    onClick={() => setSelected(call)}
                    className={`grid w-full grid-cols-[1fr_auto_auto_auto] gap-3 rounded-tile px-3 py-1 text-left ${
                      selected === call ? "bg-blue text-white" : "bg-white"
                    }`}
                  >
                    <span>{call.path.replace("/api/", "")}</span>
                    <span>{call.status ?? "no answer"}</span>
                    <span>{call.ms} ms</span>
                    <span>{sourceOf(call)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div>
        {selected === null ? (
          <p className="text-muted">Select a request to see its bodies and calls.</p>
        ) : (
          <>
            <p className="text-sm text-muted">Request ID {selected.requestId ?? "none"}</p>
            <Block label="Request body" value={selected.requestBody} />
            <Block label="Response body" value={selected.responseBody} />
            {selected.requestId && (
              // Keyed, so a new selection starts from "loading" again.
              <ServerDetail key={selected.requestId} requestId={selected.requestId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
