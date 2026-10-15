"use client";

import { useRef, useState } from "react";
import type { Filters } from "@/domain/filters";
import type { Offer } from "@/domain/offer";
import type { SavingsEstimate } from "@/domain/savings";
import {
  ApiRequestError,
  errorMessage,
  explainRequest,
  interpretRequest,
  isAbort,
  searchRequest,
  type ClientErrorCode,
} from "./api-client";
import { ChipList } from "./ChipList";
import { FeePanel } from "./FeePanel";
import { createLatest } from "./latest";
import { OfferCard } from "./OfferCard";

// Cards shown, and the offers explained: the explain endpoint takes at most ten.
const MAX_SHOWN = 10;

type Ready = {
  phase: "ready";
  filters: Filters;
  source: "llm" | "fallback";
  offers: Offer[];
  savings: SavingsEstimate;
  // null while /api/explain is pending; {} when no lines could be had.
  lines: Record<string, string> | null;
  refreshing: boolean;
};

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; code: ClientErrorCode }
  | Ready;

function statusText(state: State): string {
  switch (state.phase) {
    case "loading":
      return "Finding offers…";
    case "error":
      return "";
    case "ready":
      if (state.refreshing) return "Updating results…";
      if (state.offers.length === 0) return "No offers match.";
      return state.offers.length === 1
        ? "1 offer matches."
        : `${state.offers.length} offers match.`;
    default:
      return "";
  }
}

export function Finder({ maxQueryChars }: { maxQueryChars: number }) {
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [state, setState] = useState<State>({ phase: "idle" });
  const latest = useRef(createLatest());
  const lastAction = useRef<() => void>(() => {});

  type Request = ReturnType<ReturnType<typeof createLatest>["begin"]>;

  async function searchAndExplain(filters: Filters, source: "llm" | "fallback", req: Request) {
    const found = await searchRequest(filters, req.signal);
    if (!req.isCurrent()) return;
    setState({
      phase: "ready",
      filters,
      source,
      offers: found.offers,
      savings: found.savings,
      lines: null,
      refreshing: false,
    });
    const ids = found.offers.slice(0, MAX_SHOWN).map((offer) => offer.id);
    if (ids.length === 0) return;
    let lines: Record<string, string> = {};
    try {
      const explained = await explainRequest(filters, ids, req.signal);
      lines = Object.fromEntries(explained.explanations.map((e) => [e.offerId, e.text]));
    } catch (error) {
      if (isAbort(error)) return;
      // Explanations are secondary: results stay, without their lines.
    }
    if (!req.isCurrent()) return;
    setState((current) => (current.phase === "ready" ? { ...current, lines } : current));
  }

  function fail(error: unknown, req: Request) {
    if (!req.isCurrent() || isAbort(error)) return;
    setState({
      phase: "error",
      code: error instanceof ApiRequestError ? error.code : "internal_error",
    });
  }

  function submit(text: string) {
    const req = latest.current.begin();
    lastAction.current = () => submit(text);
    setState({ phase: "loading" });
    interpretRequest(text, req.signal)
      .then((result) =>
        req.isCurrent() ? searchAndExplain(result.filters, result.source, req) : undefined,
      )
      .catch((error: unknown) => fail(error, req));
  }

  function edit(next: Filters) {
    const req = latest.current.begin();
    lastAction.current = () => edit(next);
    const source = state.phase === "ready" ? state.source : "llm";
    setState((current) =>
      current.phase === "ready"
        ? { ...current, filters: next, refreshing: true, lines: null }
        : current,
    );
    searchAndExplain(next, source, req).catch((error: unknown) => fail(error, req));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (text === "") {
      setHint(
        "Type what you would like to do, for example “a cheap family day out near Brighton”.",
      );
      return;
    }
    setHint(null);
    submit(text);
  }

  const ready = state.phase === "ready" ? state : null;
  const shown = ready?.offers.slice(0, MAX_SHOWN) ?? [];
  const savingById = new Map(ready?.savings.offers.map((o) => [o.offerId, o.savingPerUsePence]));

  return (
    <main>
      <section className="rounded-b-[50%_40px] bg-white pb-12">
        <div className="mx-auto max-w-[1200px] px-5 pt-10 sm:px-10">
          <h1 className="font-heading text-[38px] font-bold leading-[1.15] text-blue">
            Find savings that fit your day
          </h1>
          <p className="mt-3 max-w-[40em]">
            Tell us what you would like to do. We show the offers that match and whether your
            membership pays for itself.
          </p>
          <form onSubmit={onSubmit} className="mt-6 flex flex-wrap gap-4" noValidate>
            <label htmlFor="query" className="sr-only">
              What would you like to do?
            </label>
            <input
              id="query"
              name="query"
              value={query}
              maxLength={maxQueryChars}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="A cheap family day out near Brighton, under £30 a head"
              // muted, not periwinkle: the boundary of the input needs 3:1 (WCAG 1.4.11).
              className="min-w-0 flex-1 basis-80 rounded-full border-2 border-muted bg-white px-[26px] py-[15px] text-slate outline-none placeholder:text-muted focus:border-blue focus:ring-2 focus:ring-blue"
            />
            <button
              type="submit"
              disabled={state.phase === "loading"}
              className="rounded-full bg-red px-[34px] py-[15px] font-heading text-base font-bold text-white disabled:opacity-60"
            >
              Find offers
            </button>
          </form>
          {hint && (
            <p role="alert" className="mt-3 text-base text-slate">
              {hint}
            </p>
          )}
          {ready && (
            <div className="mt-5">
              <ChipList filters={ready.filters} onChange={edit} disabled={ready.refreshing} />
              <p className="mt-3 text-base text-muted">
                {ready.source === "llm"
                  ? "Read by AI. Change any filter and the results update straight away."
                  : "We could not read your request with AI, so we used its keywords. Add or change filters to refine."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* One short announcement per change; the cards themselves are not live. */}
      <p role="status" className="sr-only">
        {statusText(state)}
      </p>
      <section className="mx-auto max-w-[1200px] px-5 py-10 sm:px-10">
        {state.phase === "idle" && (
          <p className="text-muted">Your matching offers will appear here.</p>
        )}
        {state.phase === "loading" && <p>Finding offers…</p>}
        {state.phase === "error" && (
          <div role="alert" className="rounded-tile border border-line bg-white px-6 py-5">
            <p>{errorMessage(state.code)}</p>
            <button
              type="button"
              onClick={() => lastAction.current()}
              className="mt-3 rounded-full border border-blue px-4 py-1 text-base text-blue"
            >
              Try again
            </button>
          </div>
        )}
        {ready && ready.offers.length === 0 && (
          <div className="rounded-tile border border-line bg-white px-6 py-5">
            <h2 className="font-heading text-[26px] font-bold text-blue">No offers match</h2>
            <p className="mt-2">
              Try removing a filter or describing what you want in broader terms. Your filters stay
              editable above.
            </p>
          </div>
        )}
        {ready && ready.offers.length > 0 && (
          <div className="grid gap-12 lg:grid-cols-[1fr_370px]">
            <div className={ready.refreshing ? "opacity-60" : undefined}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-[26px] font-bold text-blue">
                  {ready.offers.length === 1
                    ? "1 offer matches"
                    : `${ready.offers.length} offers match`}
                </h2>
                <p className="text-base text-muted">Showing offers that are valid today</p>
              </div>
              {ready.offers.length > MAX_SHOWN && (
                <p className="mt-1 text-base text-muted">
                  The {MAX_SHOWN} best matches are listed. The fee panel counts all{" "}
                  {ready.offers.length}.
                </p>
              )}
              <ul className="mt-4 space-y-4">
                {shown.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    savingPerUsePence={savingById.get(offer.id)}
                    line={ready.lines?.[offer.id]}
                    linePending={ready.lines === null}
                  />
                ))}
              </ul>
            </div>
            <FeePanel offers={ready.offers} savings={ready.savings} />
          </div>
        )}
      </section>
    </main>
  );
}
