"use client";

import { useRef, useState } from "react";
import type { Filters } from "@/domain/filters";
import { Audience, Category, Tier } from "@/domain/offer";
import { UK_REGIONS } from "@/domain/search-offers";
import { addFilter, filterChips, removeChip, type FilterField, type NewFilter } from "./chips";
import { ADD_BUTTON, focusAfterRemoval } from "./focus";
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
  // Remove buttons by chip id, and the add button, so focus can be moved by hand.
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);

  function remove(chip: (typeof chips)[number]) {
    if (disabled) return;
    // Focus moves before the chip unmounts, so it is never left on the page body.
    const target = focusAfterRemoval(
      chips.map((c) => c.id),
      chip.id,
    );
    (target === ADD_BUTTON ? addButton.current : removeButtons.current.get(target))?.focus();
    onChange(removeChip(filters, chip));
  }

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
    addButton.current?.focus();
    onChange(next);
  }

  return (
    <div>
      <ul className="flex flex-wrap items-center gap-3">
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
              ref={(element) => {
                if (element) removeButtons.current.set(chip.id, element);
                else removeButtons.current.delete(chip.id);
              }}
              // aria-disabled, not disabled, so focus stays while results refresh.
              aria-disabled={disabled}
              onClick={() => remove(chip)}
              aria-label={`Remove filter ${chip.label} ${chip.value}`}
              className="inline-flex size-6 items-center justify-center text-blue aria-disabled:opacity-50"
            >
              ×
            </button>
          </li>
        ))}
        {chips.length === 0 && <li className="text-base text-muted">No filters yet</li>}
        <li>
          <button
            type="button"
            ref={addButton}
            aria-disabled={disabled}
            onClick={() => {
              if (!disabled) setAdding((open) => !open);
            }}
            aria-expanded={adding}
            aria-controls="add-filter-form"
            className="min-h-6 rounded-full border border-dashed border-blue bg-white px-[14px] py-1 text-base text-blue aria-disabled:opacity-50"
          >
            Add a filter
          </button>
        </li>
      </ul>

      {adding && (
        <form
          id="add-filter-form"
          onSubmit={submit}
          className="mt-3 flex flex-wrap items-center gap-3"
        >
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
