import type { Filters } from "@/domain/filters";
import type { Audience, Category, Tier } from "@/domain/offer";

// What a case expects of the interpreted filters. A field that is named must
// match; a field that is not named must be absent, so the model cannot invent a
// tier or a price. Keywords are the exception: extra keywords are allowed
// (keywords are any-of), and `keywordsInclude` must all be present.
export type Expect = {
  categories?: Category[];
  region?: string;
  maxPricePerPerson?: number;
  audience?: Audience;
  tier?: Tier;
  keywordsInclude?: string[];
};

export type Verdict = { pass: true } | { pass: false; reasons: string[] };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function scoreCase(expect: Expect, actual: Filters): Verdict {
  const reasons: string[] = [];

  const wantedCategories = [...(expect.categories ?? [])].sort();
  const gotCategories = [...actual.categories].sort();
  if (wantedCategories.join() !== gotCategories.join()) {
    reasons.push(`categories: expected [${wantedCategories}], got [${gotCategories}]`);
  }

  const scalar = <T extends string | number>(
    name: string,
    wanted: T | undefined,
    got: T | undefined,
    equal: (a: T, b: T) => boolean = (a, b) => a === b,
  ) => {
    const matches = wanted === undefined || got === undefined ? wanted === got : equal(wanted, got);
    if (!matches) reasons.push(`${name}: expected ${wanted ?? "absent"}, got ${got ?? "absent"}`);
  };
  scalar("region", expect.region, actual.region, (a, b) => same(String(a), String(b)));
  scalar("maxPricePerPerson", expect.maxPricePerPerson, actual.maxPricePerPerson);
  scalar("audience", expect.audience, actual.audience);
  scalar("tier", expect.tier, actual.tier);

  const keywords = actual.keywords.map((keyword) => keyword.toLowerCase());
  for (const keyword of expect.keywordsInclude ?? []) {
    if (!keywords.includes(keyword.toLowerCase())) {
      reasons.push(`keywords: expected "${keyword}", got [${actual.keywords}]`);
    }
  }

  return reasons.length === 0 ? { pass: true } : { pass: false, reasons };
}
