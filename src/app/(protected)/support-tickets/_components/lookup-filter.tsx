"use client";

import * as React from "react";
import { X } from "lucide-react";

import type { LookupKind } from "@/shared/api/services/lookup.service";
import {
  AsyncCombobox,
  type AsyncComboboxPage,
} from "@/shared/components/ui/async-combobox";
import { FilterField } from "@/shared/components/ui/filter-bar";
import { useLookupLabel } from "@/shared/hooks/use-lookup-label";

/**
 * One id filter: a searchable, paging combobox with a Clear beside its label.
 *
 * Five of these on one bar is what makes it worth its own component — and the
 * label handling is the part that would be easy to get subtly wrong five times
 * over. The URL carries ids, so a restored link has nothing to render on the
 * trigger; `useLookupLabel` resolves that. A label picked in this session is
 * already known and takes precedence, which saves the lookup entirely.
 *
 * The picked label is discarded the moment the value changes from outside —
 * a Reset, or a different restored URL — rather than being left to describe an
 * id it no longer belongs to.
 */
export interface LookupFilterProps {
  label: string;
  hint?: string;
  kind: LookupKind;
  fetchPage: (page: number, query: string) => Promise<AsyncComboboxPage>;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
}

export function LookupFilter({
  label,
  hint,
  kind,
  fetchPage,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
}: LookupFilterProps) {
  const [picked, setPicked] = React.useState<{
    value: string;
    label: string;
  } | null>(null);

  const resolved = useLookupLabel(kind, value);

  // Only the label for *this* id counts; anything else is stale.
  const selectedLabel =
    picked && picked.value === value
      ? picked.label
      : value
        ? resolved
        : undefined;

  return (
    <FilterField
      label={label}
      hint={hint}
      className={className}
      action={
        value ? (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              onChange("");
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-3" aria-hidden />
            Clear
          </button>
        ) : null
      }
    >
      <AsyncCombobox
        value={value}
        selectedLabel={selectedLabel}
        onChange={(option) => {
          setPicked({ value: option.value, label: option.label });
          onChange(option.value);
        }}
        fetchPage={fetchPage}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
      />
    </FilterField>
  );
}
