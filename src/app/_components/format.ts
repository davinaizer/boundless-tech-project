import type { Tier } from "@/domain/offer";

// Pence to pounds for display: whole pounds without decimals, otherwise two.
export function formatPence(pence: number): string {
  const pounds = Math.abs(pence) / 100;
  const text = Number.isInteger(pounds) ? String(pounds) : pounds.toFixed(2);
  return `${pence < 0 ? "-" : ""}£${text}`;
}

// A price or budget given in pounds.
export function formatPounds(pounds: number): string {
  return formatPence(Math.round(pounds * 100));
}

// "£6 ahead" or "£6 short": the margin of a tier's usable offers against its fee.
export function formatMargin(marginPence: number): string {
  const amount = formatPence(Math.abs(marginPence));
  return marginPence >= 0 ? `${amount} ahead` : `${amount} short`;
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
