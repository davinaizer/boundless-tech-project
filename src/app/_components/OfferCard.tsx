import type { Offer } from "@/domain/offer";
import { formatPence, tierText, validityText } from "./format";

export function OfferCard({
  offer,
  savingPerUsePence,
  line,
  linePending,
}: {
  offer: Offer;
  savingPerUsePence: number | undefined;
  // The model's or the deterministic match line; undefined until /api/explain answers.
  line: string | undefined;
  linePending: boolean;
}) {
  return (
    <li className="overflow-hidden rounded-tile border border-line bg-white">
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div className="min-w-0">
          <h3 className="font-heading text-[21px] font-bold leading-tight text-blue">
            {offer.title}
          </h3>
          <p className="text-base text-muted">
            {offer.partner}, {offer.region}
          </p>
          <p className="mt-2 min-h-[1.45em]">
            {line ??
              (linePending ? <span className="text-muted">Working out why it fits…</span> : null)}
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
      <div className="flex flex-wrap justify-between gap-x-4 bg-slate px-6 py-[9px] font-heading text-base font-bold text-white">
        <span>{tierText(offer.tier)}</span>
        <span>{validityText(offer.expiryDate)}</span>
      </div>
    </li>
  );
}
