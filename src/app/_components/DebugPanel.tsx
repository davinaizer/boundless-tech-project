"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@/domain/api";
import { healthRequest, isAbort } from "./api-client";

type Runtime = HealthResponse | "loading" | "unavailable";

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

// The running server's provider, model and data adapter, read from /api/health
// when the page loads. It is fetched, not passed in from the layout: the page is
// static (ADR-014), so a layout prop would show the build's environment.
export function DebugPanel() {
  const [runtime, setRuntime] = useState<Runtime>("loading");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    healthRequest(controller.signal).then(setRuntime, (error: unknown) => {
      if (!isAbort(error)) setRuntime("unavailable");
    });
    return () => controller.abort();
  }, []);

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
      <div id="debug-panel-body" hidden={!open} className="border-t border-line bg-tint">
        {typeof runtime === "object" ? (
          <dl className="mx-auto grid max-w-[1200px] grid-cols-[max-content_1fr] gap-x-6 gap-y-1 px-5 py-3 sm:px-10">
            <dt className="text-muted">AI provider</dt>
            <dd>{runtime.ai.provider}</dd>
            <dt className="text-muted">Model</dt>
            <dd>{runtime.ai.model}</dd>
            <dt className="text-muted">Data adapter</dt>
            <dd>{runtime.data.adapter}</dd>
            <dt className="text-muted">Version</dt>
            <dd>{runtime.version}</dd>
          </dl>
        ) : (
          <p className="mx-auto max-w-[1200px] px-5 py-3 text-muted sm:px-10">
            {runtime === "loading" ? "Checking the server…" : "Runtime info unavailable."}
          </p>
        )}
      </div>
    </section>
  );
}
