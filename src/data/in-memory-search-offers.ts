import "server-only";
import type { Filters } from "@/domain/filters";
import type { Offer } from "@/domain/offer";
import { UK_WIDE_REGION, type SearchOffers } from "@/domain/search-offers";

// Rules are the behaviour table in docs/architecture.md, proved by the contract suite.

// Whole pence, so float noise (0.07 * 3) cannot break a tie.
const annualSavingPence = (offer: Offer) =>
  Math.round(offer.typicalSavingPerUse * 100) * offer.assumedUsesPerYear;

// Code-point order, not locale order, so it is the same on every host.
const compareIds = (a: Offer, b: Offer) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Each field is searched on its own, so a keyword cannot match across the two.
const keywordMatches = (offer: Offer, keywords: readonly string[]) => {
  const fields = [offer.title.toLowerCase(), offer.partner.toLowerCase()];
  return keywords.filter((keyword) => {
    const needle = keyword.toLowerCase();
    return fields.some((field) => field.includes(needle));
  }).length;
};

const matches = (offer: Offer, filters: Filters, today: string) => {
  if (offer.expiryDate !== undefined && offer.expiryDate < today) return false;
  if (filters.categories.length > 0 && !filters.categories.includes(offer.category)) return false;
  // `plus` members can use Standard offers too, so only `standard` narrows.
  if (filters.tier === "standard" && offer.tier !== "standard") return false;
  if (filters.audience !== undefined && !offer.audience.includes(filters.audience)) return false;
  if (
    filters.region !== undefined &&
    offer.region !== UK_WIDE_REGION &&
    offer.region.toLowerCase() !== filters.region.toLowerCase()
  ) {
    return false;
  }
  if (
    filters.maxPricePerPerson !== undefined &&
    offer.typicalPricePerPerson > filters.maxPricePerPerson
  ) {
    return false;
  }
  return filters.keywords.length === 0 || keywordMatches(offer, filters.keywords) > 0;
};

export function createInMemorySearchOffers(offers: readonly Offer[]): SearchOffers {
  return {
    async search(filters, today) {
      return offers
        .filter((offer) => matches(offer, filters, today))
        .map((offer) => ({ offer, hits: keywordMatches(offer, filters.keywords) }))
        .sort(
          (a, b) =>
            b.hits - a.hits ||
            annualSavingPence(b.offer) - annualSavingPence(a.offer) ||
            compareIds(a.offer, b.offer),
        )
        .map(({ offer }) => offer);
    },

    async getByIds(ids) {
      const wanted = new Set(ids);
      return offers.filter((offer) => wanted.has(offer.id)).sort(compareIds);
    },
  };
}
