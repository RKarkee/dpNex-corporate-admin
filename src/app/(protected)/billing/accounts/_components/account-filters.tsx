"use client";

import * as React from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Combobox } from "@/shared/components/ui/combobox";
import {
  FilterField,
  FilterGroup,
  TriStateSelect,
} from "@/shared/components/ui/filter-bar";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useCountryOptions } from "@/shared/hooks/use-location-options";

import {
  countActiveFilters,
  countAdvancedFilters,
  MAX_LENGTH,
  PER_PAGE_OPTIONS,
} from "../lib/account-params";
import type { BillingAccountFilterValues } from "../types";

/**
 * Filter bar: search, status, default and rows per page always on screen; the
 * other eight behind "More filters" — the same arrangement as the
 * support-ticket queue. Rows per page is not a filter, so it applies at once
 * rather than waiting for Apply, the same as the bulk-upload list.
 *
 * Draft state is local and handed up on Apply, so typing doesn't refetch on
 * every keystroke. The draft re-syncs whenever the applied filters change from
 * outside (Clear, a restored URL).
 */

export interface AccountFiltersProps {
  value: BillingAccountFilterValues;
  onApply: (filters: BillingAccountFilterValues) => void;
  onReset: () => void;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  disabled?: boolean;
}

export function AccountFilters({
  value,
  onApply,
  onReset,
  perPage,
  onPerPageChange,
  disabled,
}: AccountFiltersProps) {
  const [draft, setDraft] = React.useState<BillingAccountFilterValues>(value);
  const { options: countryOptions, loading: countriesLoading } = useCountryOptions();

  // Open when a restored URL already carries hidden filters — a filter the
  // user cannot see is one they will forget is applied.
  const [expanded, setExpanded] = React.useState(countAdvancedFilters(value) > 0);

  // Adjusted during render rather than in an effect, so nothing flashes.
  const appliedKey = JSON.stringify(value);
  const [syncedKey, setSyncedKey] = React.useState(appliedKey);
  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey);
    setDraft(value);
    if (countAdvancedFilters(value) > 0) setExpanded(true);
  }

  const set = <K extends keyof BillingAccountFilterValues>(
    key: K,
    next: BillingAccountFilterValues[K],
  ) => setDraft((prev) => ({ ...prev, [key]: next }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };

  const dirty = JSON.stringify(draft) !== appliedKey;
  const activeCount = countActiveFilters(value);
  const draftAdvancedCount = countAdvancedFilters(draft);

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Primary row ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <FilterField
            label="Search"
            htmlFor="billing-account-search"
            hint="Matches the account name, legal name or code"
            className="flex-1"
          >
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="billing-account-search"
                value={draft.search}
                maxLength={MAX_LENGTH.search}
                onChange={(event) => set("search", event.target.value)}
                placeholder="Himalaya…"
                className="h-11 pl-9"
              />
            </div>
          </FilterField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[540px]">
            <FilterField label="Status" htmlFor="billing-account-status">
              <NativeSelect
                id="billing-account-status"
                value={draft.status}
                onChange={(event) => set("status", event.target.value)}
                options={[
                  { value: "", label: "Any status" },
                  { value: "A", label: "Enabled" },
                  { value: "I", label: "Disabled" },
                ]}
              />
            </FilterField>

            <FilterField label="Default" htmlFor="billing-account-primary">
              <TriStateSelect
                id="billing-account-primary"
                value={draft.is_primary}
                onChange={(next) => set("is_primary", next)}
                yesLabel="Default only"
                noLabel="Not default"
              />
            </FilterField>

            <FilterField label="Rows per page" htmlFor="billing-account-per-page">
              <NativeSelect
                id="billing-account-per-page"
                value={String(perPage)}
                disabled={disabled}
                onChange={(event) => onPerPageChange(Number(event.target.value))}
                options={PER_PAGE_OPTIONS.map((size) => ({
                  value: String(size),
                  label: `${size} per page`,
                }))}
              />
            </FilterField>
          </div>
        </div>

        {/* ── Collapsible panel ────────────────────────────────────────── */}
        {expanded ? (
          <div className="space-y-5 border-t border-border pt-4">
            <FilterGroup title="Identifiers">
              <FilterField
                label="Account code"
                htmlFor="billing-account-code"
                hint="Prefix match"
              >
                <Input
                  id="billing-account-code"
                  value={draft.billing_account_code}
                  maxLength={MAX_LENGTH.billing_account_code}
                  onChange={(event) => set("billing_account_code", event.target.value)}
                  placeholder="HIMALAYA"
                />
              </FilterField>

              <FilterField
                label="Account name"
                htmlFor="billing-account-name"
                hint="Substring match"
              >
                <Input
                  id="billing-account-name"
                  value={draft.account_name}
                  maxLength={MAX_LENGTH.account_name}
                  onChange={(event) => set("account_name", event.target.value)}
                  placeholder="Head Office"
                />
              </FilterField>

              <FilterField label="PAN" htmlFor="billing-account-pan">
                <Input
                  id="billing-account-pan"
                  value={draft.pan}
                  maxLength={MAX_LENGTH.pan}
                  onChange={(event) => set("pan", event.target.value)}
                  placeholder="301234567"
                />
              </FilterField>

              <FilterField label="VAT" htmlFor="billing-account-vat">
                <Input
                  id="billing-account-vat"
                  value={draft.vat}
                  maxLength={MAX_LENGTH.vat}
                  onChange={(event) => set("vat", event.target.value)}
                  placeholder="VAT-4455667"
                />
              </FilterField>
            </FilterGroup>

            <FilterGroup title="Address">
              <FilterField label="Country" hint="Any of the account's addresses">
                <Combobox
                  options={countryOptions}
                  value={draft.country}
                  onChange={(next) => set("country", next)}
                  placeholder={countriesLoading ? "Loading…" : "Any country"}
                  searchPlaceholder="Search countries…"
                  emptyText="No countries found"
                  // A typo would be sent as an ISO code and rejected.
                  allowCustomValue={false}
                  disabled={countriesLoading}
                />
              </FilterField>

              <FilterField
                label="City"
                htmlFor="billing-account-city"
                hint="Any of the account's addresses"
              >
                <Input
                  id="billing-account-city"
                  value={draft.city}
                  maxLength={MAX_LENGTH.city}
                  onChange={(event) => set("city", event.target.value)}
                  placeholder="Kathmandu"
                />
              </FilterField>
            </FilterGroup>

            <FilterGroup title="Dates">
              <FilterField
                label="Created from"
                htmlFor="billing-account-created-from"
                hint="Inclusive"
              >
                <Input
                  id="billing-account-created-from"
                  type="date"
                  value={draft.created_from}
                  max={draft.created_to || undefined}
                  onChange={(event) => set("created_from", event.target.value)}
                />
              </FilterField>

              <FilterField label="Created to" htmlFor="billing-account-created-to">
                <Input
                  id="billing-account-created-to"
                  type="date"
                  value={draft.created_to}
                  // Bounds each other, so the range cannot be inverted.
                  min={draft.created_from || undefined}
                  onChange={(event) => set("created_to", event.target.value)}
                />
              </FilterField>
            </FilterGroup>
          </div>
        ) : null}

        {/* ── Action bar ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {activeCount > 0 ? (
              <Badge variant="secondary">
                {activeCount} filter{activeCount === 1 ? "" : "s"} applied
              </Badge>
            ) : (
              <span>Showing every billing account</span>
            )}
            {dirty ? <span className="text-amber-600">Unapplied changes</span> : null}
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="col-span-2 sm:col-span-1"
              onClick={() => setExpanded((prev) => !prev)}
              disabled={disabled}
              aria-expanded={expanded}
            >
              <SlidersHorizontal className="size-4" />
              More filters
              {draftAdvancedCount > 0 ? (
                <Badge variant="secondary">{draftAdvancedCount}</Badge>
              ) : null}
              <ChevronDown
                aria-hidden
                className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </Button>

            <Button type="submit" disabled={disabled || !dirty}>
              Apply
            </Button>

            <Button type="button" variant="ghost" onClick={onReset} disabled={disabled}>
              <RotateCcw className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
