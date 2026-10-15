import { FILTER_LIMITS, Filters } from "@/domain/filters";

// The query string is external input, so it is parsed as untrusted: each value is
// checked on its own and an invalid one is dropped, never fatal (CLAUDE.md:
// validate at the boundary). The user's own words are not in the URL, only the
// filters that were understood.
export function filtersToSearch(filters: Filters): string {
  const params = new URLSearchParams();
  for (const category of filters.categories) params.append("category", category);
  if (filters.region) params.set("region", filters.region);
  if (filters.maxPricePerPerson !== undefined) {
    params.set("maxPrice", String(filters.maxPricePerPerson));
  }
  if (filters.audience) params.set("audience", filters.audience);
  if (filters.tier) params.set("tier", filters.tier);
  for (const keyword of filters.keywords) params.append("keyword", keyword);
  return params.toString();
}

// `null` when the URL names no usable filter, so the page can tell "a link with
// filters" from "no request yet".
export function filtersFromSearch(search: string): Filters | null {
  const params = new URLSearchParams(search);
  const draft: Record<string, unknown> = {};
  const ok = (field: string, value: unknown) => Filters.safeParse({ [field]: value }).success;

  const categories = params.getAll("category").filter((value) => ok("categories", [value]));
  if (categories.length > 0) draft.categories = categories;

  const keywords = params
    .getAll("keyword")
    .filter((value) => ok("keywords", [value]))
    .slice(0, FILTER_LIMITS.maxKeywords);
  if (keywords.length > 0) draft.keywords = keywords;

  // Number("") is 0, which would read an empty parameter as a £0 budget.
  const rawPrice = params.get("maxPrice")?.trim();
  const price = rawPrice === undefined || rawPrice === "" ? null : Number(rawPrice);
  const single: [string, unknown][] = [
    ["region", params.get("region")],
    ["maxPricePerPerson", price],
    ["audience", params.get("audience")],
    ["tier", params.get("tier")],
  ];
  for (const [field, value] of single) {
    if (value !== null && ok(field, value)) draft[field] = value;
  }

  const parsed = Filters.safeParse(draft);
  if (!parsed.success) return null;
  const f = parsed.data;
  const empty =
    f.categories.length === 0 &&
    f.keywords.length === 0 &&
    f.region === undefined &&
    f.maxPricePerPerson === undefined &&
    f.audience === undefined &&
    f.tier === undefined;
  return empty ? null : f;
}
