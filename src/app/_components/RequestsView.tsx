"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  debugEntriesServerSnapshot,
  debugEntriesSnapshot,
  loadDebugEntry,
  subscribeDebugEntries,
  type EntryState,
} from "./debug-entries";
import {
  badgeOf,
  groupCalls,
  parseIfJson,
  summariseGroup,
  timingSplit,
  type CallGroup,
} from "./debug-groups";
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

const useEntries = () =>
  useSyncExternalStore(subscribeDebugEntries, debugEntriesSnapshot, debugEntriesServerSnapshot);

const formatCost = (usd: number) => `≈ $${usd.toFixed(5)}`;

function GroupTotals({
  group,
  entries,
}: {
  group: CallGroup;
  entries: ReadonlyMap<string, EntryState>;
}) {
  const summary = summariseGroup(group, entries);
  const head = `${group.calls.length} ${group.calls.length === 1 ? "call" : "calls"} · ${group.totalMs} ms`;
  if (summary.state === "loading") return <p className="text-sm text-muted">{head} · …</p>;
  if (summary.state === "unknown") {
    return <p className="text-sm text-muted">{head} · tokens and cost n/a (a record is gone)</p>;
  }
  return (
    <p className="text-sm text-muted">
      {head} · {summary.modelCalls} model {summary.modelCalls === 1 ? "call" : "calls"} ·{" "}
      {summary.tokens.toLocaleString("en-GB")} tokens · {formatCost(summary.costUsd)}
    </p>
  );
}

const SEGMENTS = [
  { key: "modelMs", label: "model", tone: "bg-blue" },
  { key: "dataMs", label: "data", tone: "bg-slate" },
  { key: "otherMs", label: "other server", tone: "bg-periwinkle" },
  { key: "networkMs", label: "network and browser", tone: "bg-muted" },
] as const;

// Where the selected request's time went. The text carries the figures; the bar
// is a picture of the same numbers.
function Timing({ clientMs, entry }: { clientMs: number; entry: Exclude<EntryState, "missing"> }) {
  const split = timingSplit(clientMs, entry);
  const total = SEGMENTS.reduce((sum, { key }) => sum + split[key], 0) || 1;
  return (
    <div className="mt-2">
      <p className="text-sm font-bold text-muted">Timing</p>
      <div aria-hidden="true" className="mt-1 flex h-2 overflow-hidden rounded-full bg-white">
        {SEGMENTS.map(({ key, tone }) => (
          <span key={key} className={tone} style={{ width: `${(split[key] / total) * 100}%` }} />
        ))}
      </div>
      <p className="mt-1 text-sm">
        {SEGMENTS.map(({ key, label }) => `${label} ${split[key]} ms`).join(" · ")}
      </p>
    </div>
  );
}

function ServerDetail({ call, entry }: { call: ClientCall; entry: EntryState | undefined }) {
  if (entry === undefined) return <p className="mt-2 text-muted">Loading the server record…</p>;
  if (entry === "missing") {
    return <p className="mt-2 text-muted">No server record (it keeps the last 20).</p>;
  }
  return (
    <>
      <Timing clientMs={call.ms} entry={entry} />
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
  const entries = useEntries();

  // Each request's server record is fetched once; it feeds the totals, badges and timing.
  useEffect(() => {
    for (const call of calls) if (call.requestId) loadDebugEntry(call.requestId);
  }, [calls]);

  if (calls.length === 0) {
    return <p className="text-muted">No requests yet. Run a search.</p>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-3">
        {groupCalls(calls).map((group) => (
          <section key={`${group.calls[0]!.requestId ?? "none"}-${group.label}`}>
            <h3 className="font-heading text-base font-bold break-words text-ink">{group.label}</h3>
            <GroupTotals group={group} entries={entries} />
            <ul className="mt-1 flex flex-col gap-1">
              {group.calls.map((call, index) => {
                const badge = badgeOf(call.requestId ? entries.get(call.requestId) : undefined);
                return (
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
                      {badge ? (
                        <span className="rounded-full bg-warn-tint px-2 text-warn">{badge}</span>
                      ) : (
                        <span>{sourceOf(call)}</span>
                      )}
                    </button>
                  </li>
                );
              })}
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
              <ServerDetail call={selected} entry={entries.get(selected.requestId)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
