import type { Tier } from "@/domain/offer";
import type { SavingsEstimate } from "@/domain/savings";

// Pence to pounds for display: whole pounds without decimals, otherwise two, with
// thousands separators.
export function formatPence(pence: number): string {
  const pounds = Math.abs(pence) / 100;
  const text = Number.isInteger(pounds)
    ? pounds.toLocaleString("en-GB")
    : pounds.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${pence < 0 ? "-" : ""}£${text}`;
}

// An estimate in whole pounds: "£2,064". Pence would claim accuracy the assumed
// uses do not have.
export function formatWholePounds(pence: number): string {
  return formatPence(Math.round(pence / 100) * 100);
}

// A price or budget given in pounds.
export function formatPounds(pounds: number): string {
  return formatPence(Math.round(pounds * 100));
}

type TierEstimate = SavingsEstimate["tiers"][number];

// The tiers worth a sentence. Standard is always shown. Plus only when it unlocks
// a counted offer Standard cannot use; otherwise it would repeat Standard with a
// higher fee.
export function tiersToShow(tiers: readonly TierEstimate[]): TierEstimate[] {
  const standard = tiers.find((t) => t.tier === "standard");
  const plus = tiers.find((t) => t.tier === "plus");
  const shown = [standard];
  if (plus && (!standard || plus.usableOffers > standard.usableOffers)) shown.push(plus);
  return shown.filter((t) => t !== undefined);
}

// One plain sentence pair for a tier: what it costs, then what the counted offers
// could save against that. The margin is rounded like the total; fees are whole
// pounds, so the two cannot disagree.
export function tierSentence(tier: TierEstimate, countedOffers: number): string {
  const cost = `${tierName(tier.tier)} costs ${formatPence(tier.feePence)} a year.`;
  if (tier.usableOffers === 0) {
    return `${cost} None of ${countedOffers === 1 ? "this offer is" : `these ${countedOffers} offers are`} included.`;
  }
  const subject =
    tier.usableOffers === countedOffers
      ? countedOffers === 1
        ? "This offer"
        : `These ${countedOffers} offers`
      : `${tier.usableOffers} of these ${countedOffers} offers ${tier.usableOffers === 1 ? "is" : "are"} included and`;
  const margin = Math.round(tier.marginPence / 100);
  const against =
    margin === 0
      ? "about the same as the fee"
      : `about ${formatPence(Math.abs(margin) * 100)} ${margin > 0 ? "more" : "less"} than the fee`;
  return `${cost} ${subject} could save you about ${formatWholePounds(tier.usableSavingPence)}, so ${against}.`;
}

// An offer's expiry date is an ISO calendar date; it is formatted in UTC so the
// reader's time zone cannot move it a day.
export function validityText(expiryDate: string | undefined): string {
  if (expiryDate === undefined) return "Valid all year";
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${expiryDate}T00:00:00Z`));
  return `Valid until ${date}`;
}

// Tier eligibility is always written, never colour alone (DESIGN.md).
export function tierText(tier: Tier): string {
  return tier === "standard" ? "Included with Standard and Plus" : "Plus membership only";
}

export function tierName(tier: Tier): string {
  return tier === "standard" ? "Standard" : "Plus";
}
