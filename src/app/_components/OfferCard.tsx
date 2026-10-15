import type { Explanation } from "@/domain/match-reasons";
import type { Offer } from "@/domain/offer";
import { formatPence, tierText, validityText } from "./format";
import { Spinner } from "./Spinner";

// Marks a line the model wrote. A deterministic line never carries it.
function SparkMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-blue"
    >
      <svg viewBox="0 0 24 24" className="size-3 fill-white">
        <path d="M12 2l2.2 6.3L20.5 10l-6.3 1.7L12 18l-2.2-6.3L3.5 10l6.3-1.7z" />
      </svg>
    </span>
  );
}

export function OfferCard({
  offer,
  savingPerUsePence,
  line,
  linePending,
}: {
  offer: Offer;
  savingPerUsePence: number | undefined;
  // The model's or the deterministic match line; undefined until /api/explain answers.
  line: Explanation | undefined;
  linePending: boolean;
}) {
  const showBlock = line !== undefined || linePending;
  return (
    <li className="overflow-hidden rounded-tile border border-line bg-white">
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
        <div className="min-w-0">
          <h3 className="font-heading text-[21px] font-bold leading-tight text-blue">
            {offer.title}
          </h3>
          <p className="text-base text-muted">
            {offer.partner}, {offer.region}
          </p>
        </div>
        {savingPerUsePence !== undefined && (
          <div className="shrink-0 rounded-full border border-periwinkle bg-tint px-[18px] py-2 text-center">
            <div className="font-heading text-2xl font-bold leading-tight text-blue">
              {formatPence(savingPerUsePence)}
            </div>
            <div className="text-base text-slate">saved per use</div>
          </div>
        )}
      </div>
      {showBlock && (
        <div className="mx-6 mb-5 rounded-tile bg-tint px-4 pt-3 pb-4">
          <p className="flex flex-wrap items-center gap-x-2 font-heading text-base font-bold text-blue">
            {line === undefined ? <Spinner /> : line.source === "llm" && <SparkMark />}
            <span>Why it fits</span>
            {line !== undefined && (
              <span className="font-body font-normal text-muted sm:ml-auto">
                {line.source === "llm" ? "Written by AI" : "Matched on your filters"}
              </span>
            )}
          </p>
          {line === undefined ? (
            <p className="mt-1 text-muted">Working out why it fits…</p>
          ) : (
            <p className="mt-1 text-ink motion-safe:animate-fade-in">{line.text}</p>
          )}
        </div>
      )}
      <div
        className={`flex flex-wrap justify-between gap-x-4 px-6 py-[9px] font-heading text-base font-bold text-white ${
          offer.tier === "standard" ? "bg-blue" : "bg-slate"
        }`}
      >
        <span>{tierText(offer.tier)}</span>
        <span>{validityText(offer.expiryDate)}</span>
      </div>
    </li>
  );
}
