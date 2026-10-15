"use client";

import { useState } from "react";
import type { Filters } from "@/domain/filters";
import { Audience, Category, Tier } from "@/domain/offer";
import { UK_REGIONS } from "@/domain/search-offers";
import { addFilter, filterChips, removeChip, type FilterField, type NewFilter } from "./chips";
import { tierName } from "./format";

const FIELD_LABELS: Record<FilterField, string> = {
  category: "Category",
  audience: "Who",
  region: "Where",
  price: "Price (£ each)",
  tier: "Membership",
  keyword: "Keyword",
};

const OPTIONS: Partial<Record<FilterField, readonly { value: string; label: string }[]>> = {
  category: Category.options.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " "),
  })),
  audience: Audience.options.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  })),
  tier: Tier.options.map((value) => ({ value, label: tierName(value) })),
  region: UK_REGIONS.map((value) => ({ value, label: value })),
};

const inputClass =
  "rounded-full border border-periwinkle bg-white px-4 py-1 text-base text-slate outline-none focus:ring-2 focus:ring-blue";

function toNewFilter(field: FilterField, raw: string): NewFilter | null {
  const value = raw.trim();
  if (value === "") return null;
  if (field === "price") {
    const number = Number(value);
    return Number.isFinite(number) ? { field, value: number } : null;
  }
  // The select options and the text input are the only sources of `value`.
  return { field, value } as NewFilter;
}

export function ChipList({
  filters,
  onChange,
  disabled,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  disabled: boolean;
}) {
  const chips = filterChips(filters);
  const [adding, setAdding] = useState(false);
  const [field, setField] = useState<FilterField>("category");
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const options = OPTIONS[field];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const add = toNewFilter(field, value);
    const next = add ? addFilter(filters, add) : null;
    if (!next) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setAdding(false);
    setValue("");
    onChange(next);
  }

  return (
    <div>
      <ul className="flex flex-wrap items-center gap-3" aria-label="Understood as">
        <li className="text-base text-slate">Understood as</li>
        {chips.map((chip) => (
          <li
            key={chip.id}
            className="flex items-center gap-2 rounded-full border border-periwinkle bg-tint px-[14px] py-1 text-base text-slate"
          >
            <span>
              <span className="font-heading font-bold text-blue">{chip.label}</span> {chip.value}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(removeChip(filters, chip))}
              aria-label={`Remove filter ${chip.label} ${chip.value}`}
              className="text-blue disabled:opacity-50"
            >
              ×
            </button>
          </li>
        ))}
        {chips.length === 0 && <li className="text-base text-muted">No filters yet</li>}
        <li>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAdding((open) => !open)}
            aria-expanded={adding}
            className="rounded-full border border-dashed border-blue bg-white px-[14px] py-1 text-base text-blue disabled:opacity-50"
          >
            Add a filter
          </button>
        </li>
      </ul>

      {adding && (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-base text-slate">
            <span className="sr-only">Filter type</span>
            <select
              className={inputClass}
              value={field}
              onChange={(event) => {
                setField(event.target.value as FilterField);
                setValue("");
                setInvalid(false);
              }}
            >
              {(Object.keys(FIELD_LABELS) as FilterField[]).map((key) => (
                <option key={key} value={key}>
                  {FIELD_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-base text-slate">
            <span className="sr-only">{FIELD_LABELS[field]}</span>
            {options ? (
              <select
                className={inputClass}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="">Choose…</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                type={field === "price" ? "number" : "text"}
                min={field === "price" ? 0 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={field === "price" ? "30" : "spa"}
              />
            )}
          </label>
          <button
            type="submit"
            className="rounded-full bg-blue px-4 py-1 font-heading text-base font-bold text-white"
          >
            Add
          </button>
          {invalid && (
            <span role="alert" className="text-base text-slate">
              That value could not be used.
            </span>
          )}
        </form>
      )}
    </div>
  );
}
