import { Filters } from "@/domain/filters";
import type { Audience, Category, Tier } from "@/domain/offer";
import { formatPounds, tierName } from "./format";

export type FilterField = "category" | "audience" | "region" | "price" | "tier" | "keyword";

export type Chip = {
  // Unique within one filters object; used as the React key.
  id: string;
  field: FilterField;
  label: string;
  value: string;
  // The category or keyword this chip stands for (the list fields hold several).
  item?: string;
};

const titleCase = (text: string) => {
  const spaced = text.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

// The "Understood as" chips for a filters object, in a stable order.
export function filterChips(filters: Filters): Chip[] {
  const chips: Chip[] = filters.categories.map((category) => ({
    id: `category:${category}`,
    field: "category",
    label: "Category",
    value: titleCase(category),
    item: category,
  }));
  if (filters.audience) {
    chips.push({
      id: "audience",
      field: "audience",
      label: "Who",
      value: titleCase(filters.audience),
    });
  }
  if (filters.region) {
    chips.push({ id: "region", field: "region", label: "Where", value: filters.region });
  }
  if (filters.maxPricePerPerson !== undefined) {
    chips.push({
      id: "price",
      field: "price",
      label: "Price",
      value: `up to ${formatPounds(filters.maxPricePerPerson)} each`,
    });
  }
  if (filters.tier) {
    chips.push({ id: "tier", field: "tier", label: "Membership", value: tierName(filters.tier) });
  }
  for (const keyword of filters.keywords) {
    chips.push({
      id: `keyword:${keyword}`,
      field: "keyword",
      label: "Keyword",
      value: keyword,
      item: keyword,
    });
  }
  return chips;
}

export function removeChip(filters: Filters, chip: Chip): Filters {
  switch (chip.field) {
    case "category":
      return { ...filters, categories: filters.categories.filter((c) => c !== chip.item) };
    case "keyword":
      return { ...filters, keywords: filters.keywords.filter((k) => k !== chip.item) };
    case "audience":
      return { ...filters, audience: undefined };
    case "region":
      return { ...filters, region: undefined };
    case "price":
      return { ...filters, maxPricePerPerson: undefined };
    case "tier":
      return { ...filters, tier: undefined };
  }
}

export type NewFilter =
  | { field: "category"; value: Category }
  | { field: "audience"; value: Audience }
  | { field: "tier"; value: Tier }
  | { field: "region"; value: string }
  | { field: "price"; value: number }
  | { field: "keyword"; value: string };

// Categories and keywords add to their list; the other fields replace. The result
// goes back through Filters, so trimming, de-duplication and limits apply; null
// means the value was not acceptable.
export function addFilter(filters: Filters, add: NewFilter): Filters | null {
  const draft: Record<string, unknown> = { ...filters };
  switch (add.field) {
    case "category":
      draft.categories = [...filters.categories, add.value];
      break;
    case "keyword":
      draft.keywords = [...filters.keywords, add.value];
      break;
    case "price":
      draft.maxPricePerPerson = add.value;
      break;
    default:
      draft[add.field] = add.value;
  }
  const parsed = Filters.safeParse(draft);
  return parsed.success ? parsed.data : null;
}
