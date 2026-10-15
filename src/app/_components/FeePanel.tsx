import type { Offer } from "@/domain/offer";
import type { SavingsEstimate } from "@/domain/savings";
import { formatPence, formatWholePounds, tierSentence, tiersToShow } from "./format";

export function FeePanel({
  offers,
  savings,
}: {
  offers: readonly Offer[];
  savings: SavingsEstimate;
}) {
  const titles = new Map(offers.map((offer) => [offer.id, offer.title]));
  const counted = savings.countedOffers;
  const rows = savings.offers.slice(0, counted);
  const notCounted = savings.offers.length - counted;
  const basis =
    notCounted > 0
      ? `your top ${counted} matches`
      : counted === 1
        ? "your match"
        : `your ${counted} matches`;

  const tiers = tiersToShow(savings.tiers);

  return (
    <aside
      aria-labelledby="fee-heading"
      className="relative rounded-panel bg-ink px-7 pb-6 pt-12 text-white"
    >
      <div className="absolute -top-6 right-4 flex size-28 flex-col items-center justify-center rounded-full bg-red text-center shadow-md">
        <span className="text-sm">About</span>
        <span className="font-heading text-2xl font-bold leading-tight">
          {formatWholePounds(savings.bestAnnualSavingPence)}
        </span>
        <span className="text-sm">
          a year<span className="sr-only"> from {basis}</span>
        </span>
      </div>
      <h2 id="fee-heading" className="max-w-[60%] font-heading text-2xl font-bold">
        Does the fee pay off?
      </h2>
      <p className="mt-2">
        Illustrative yearly saving, based on {basis}. Uses a year are our assumption, not your
        history.
      </p>

      <ul className="mt-5 divide-y divide-white/20">
        {rows.map((row) => (
          <li key={row.offerId} className="flex justify-between gap-4 py-2">
            <span>
              {titles.get(row.offerId) ?? row.offerId}, {row.usesPerYear}{" "}
              {row.usesPerYear === 1 ? "use" : "uses"} a year
            </span>
            <span className="shrink-0">{formatPence(row.annualSavingPence)}</span>
          </li>
        ))}
        {notCounted > 0 && (
          <li className="py-2 text-base">
            {notCounted} other {notCounted === 1 ? "match isn't" : "matches aren't"} counted
          </li>
        )}
      </ul>

      <div className="mt-5 space-y-3">
        {tiers.map((tier) => (
          <p
            key={tier.tier}
            className={`rounded-tile border border-white/30 px-5 py-4 ${
              tier.tier === "standard" ? "bg-blue" : "bg-slate"
            }`}
          >
            {tierSentence(tier, counted)}
          </p>
        ))}
      </div>
      <p className="mt-5 text-base">
        Based on sample data and assumed visits per year. Not a promise of real savings.
      </p>
    </aside>
  );
}
