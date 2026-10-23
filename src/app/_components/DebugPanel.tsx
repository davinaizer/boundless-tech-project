"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { HealthResponse } from "@/domain/api";
import { healthRequest, isAbort } from "./api-client";
import { enableDebugLog } from "./debug-log";
import { RequestsView } from "./RequestsView";

type Runtime = HealthResponse | "loading" | "unavailable";
type Tab = "runtime" | "requests";

// A real service is green and a stand-in amber; the word is always shown, so the
// colour is never the only cue (DESIGN.md).
function Badge({ label, value, real }: { label: string; value: string; real: boolean }) {
  const tone = real ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn";
  return (
    <span className={`rounded-full px-3 py-0.5 font-heading font-bold ${tone}`}>
      {label}: {value}
    </span>
  );
}

function RuntimeView({ runtime }: { runtime: HealthResponse }) {
  const rows: [string, string][] = [
    ["AI provider", runtime.ai.provider],
    ["Model", runtime.ai.model],
    ["Data adapter", runtime.data.adapter],
    ["Version", runtime.version],
  ];
  if (runtime.config) {
    rows.push(
      ["AI timeout", `${runtime.config.aiTimeoutMs} ms`],
      ["Rate limit", `${runtime.config.rateLimitPerMinute} a minute (real provider only)`],
      ["API key set", runtime.config.apiKeyPresent ? "yes" : "no"],
    );
  }
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted">{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "runtime", label: "Runtime" },
  { id: "requests", label: "Requests" },
];

// The running server's provider, model and data adapter, read from /api/health
// when the page loads. It is fetched, not passed in from the layout: the page is
// static (ADR-014), so a layout prop would show the build's environment. Under
// `next dev` the health answer says `debug: true`, and a Requests tab lists this
// page's calls (ADR-017).
export function DebugPanel() {
  const [runtime, setRuntime] = useState<Runtime>("loading");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("runtime");
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  useEffect(() => {
    const controller = new AbortController();
    healthRequest(controller.signal).then(
      (health) => {
        if (health.debug) enableDebugLog();
        setRuntime(health);
      },
      (error: unknown) => {
        if (!isAbort(error)) setRuntime("unavailable");
      },
    );
    return () => controller.abort();
  }, []);

  const debug = typeof runtime === "object" && runtime.debug;

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation).
  const onTabKey = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab === "runtime" ? "requests" : "runtime";
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      aria-label="Runtime"
      className="sticky bottom-0 z-10 border-t border-line bg-white text-base text-ink"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 sm:px-10">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="debug-panel-body"
          onClick={() => setOpen((value) => !value)}
          className="font-heading font-bold text-blue"
        >
          <span aria-hidden="true">{open ? "▾" : "▴"}</span> Debug
        </button>
        {runtime === "loading" && <span className="text-muted">Checking the server…</span>}
        {runtime === "unavailable" && <span className="text-muted">Runtime info unavailable</span>}
        {typeof runtime === "object" && (
          <>
            <Badge label="AI" value={runtime.ai.provider} real={runtime.ai.provider !== "mock"} />
            <Badge
              label="Data"
              value={runtime.data.adapter}
              real={runtime.data.adapter === "postgres"}
            />
            <span className="text-muted">{runtime.version}</span>
          </>
        )}
      </div>
      <div
        id="debug-panel-body"
        hidden={!open}
        className="max-h-[50vh] overflow-y-auto border-t border-line bg-tint"
      >
        <div className="mx-auto max-w-[1200px] px-5 py-3 sm:px-10">
          {typeof runtime !== "object" && (
            <p className="text-muted">
              {runtime === "loading" ? "Checking the server…" : "Runtime info unavailable."}
            </p>
          )}
          {typeof runtime === "object" && !debug && <RuntimeView runtime={runtime} />}
          {typeof runtime === "object" && debug && (
            <>
              <div role="tablist" aria-label="Debug views" className="mb-3 flex gap-2">
                {TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    ref={(element) => {
                      tabRefs.current[id] = element;
                    }}
                    type="button"
                    role="tab"
                    id={`debug-tab-${id}`}
                    aria-selected={tab === id}
                    aria-controls={`debug-tabpanel-${id}`}
                    tabIndex={tab === id ? 0 : -1}
                    onClick={() => setTab(id)}
                    onKeyDown={onTabKey}
                    className={`rounded-full px-3 py-0.5 font-heading font-bold ${
                      tab === id ? "bg-blue text-white" : "bg-white text-blue"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Both panels exist, so each tab's aria-controls has a target. */}
              <div
                role="tabpanel"
                id="debug-tabpanel-runtime"
                aria-labelledby="debug-tab-runtime"
                hidden={tab !== "runtime"}
              >
                <RuntimeView runtime={runtime} />
              </div>
              <div
                role="tabpanel"
                id="debug-tabpanel-requests"
                aria-labelledby="debug-tab-requests"
                hidden={tab !== "requests"}
              >
                <RequestsView />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
