import type { Offer } from "@/domain/offer";
import type { SavingsEstimate } from "@/domain/savings";
import { formatMargin, formatPence, tierName } from "./format";

const MAX_ROWS = 6;

export function FeePanel({
  offers,
  savings,
}: {
  offers: readonly Offer[];
  savings: SavingsEstimate;
}) {
  const titles = new Map(offers.map((offer) => [offer.id, offer.title]));
  const rows = savings.offers.slice(0, MAX_ROWS);
  const hidden = savings.offers.length - rows.length;

  return (
    <aside
      aria-labelledby="fee-heading"
      className="relative rounded-panel bg-slate px-7 pb-6 pt-12 text-white"
    >
      <div className="absolute -top-6 right-4 flex size-28 flex-col items-center justify-center rounded-full bg-red text-center shadow-md">
        <span className="text-sm">Up to</span>
        <span className="font-heading text-2xl font-bold leading-tight">
          {formatPence(savings.bestAnnualSavingPence)}
        </span>
        <span className="text-sm">a year</span>
      </div>
      <h2 id="fee-heading" className="max-w-[60%] font-heading text-2xl font-bold">
        Does the fee pay off?
      </h2>
      <p className="mt-2">Illustrative yearly saving from these offers</p>

      <ul className="mt-5 divide-y divide-white/20">
        {rows.map((row) => (
          <li key={row.offerId} className="flex justify-between gap-4 py-2">
            <span>
              {titles.get(row.offerId) ?? row.offerId}, {row.usesPerYear}{" "}
              {row.usesPerYear === 1 ? "use" : "uses"}
            </span>
            <span className="shrink-0">{formatPence(row.annualSavingPence)}</span>
          </li>
        ))}
        {hidden > 0 && <li className="py-2 text-base">and {hidden} more matching offers</li>}
      </ul>

      <div className="mt-5 space-y-3">
        {savings.tiers.map((tier) => (
          <div key={tier.tier} className="rounded-tile bg-white/10 px-5 py-4">
            <div className="font-heading font-bold">
              {tierName(tier.tier)}, {formatPence(tier.feePence)} a year
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span>Offers you can use: {formatPence(tier.usableSavingPence)}</span>
              <span className="rounded-full bg-white px-4 py-1 font-heading font-bold text-slate">
                {formatMargin(tier.marginPence)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-base">
        Based on sample data and assumed visits per year. Not a promise of real savings.
      </p>
    </aside>
  );
}
