"use client";

import * as React from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { FilterField, FilterGroup } from "@/shared/components/ui/filter-bar";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useLookupLabel } from "@/shared/hooks/use-lookup-label";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import {
  countActiveFilters,
  countAdvancedFilters,
  DEFAULT_FILTERS,
} from "../lib/approval-params";
import type { ApprovalFilterValues } from "../types";
import { corporateFetcher, customerFetcher } from "./lookup-fetchers";

/**
 * Filter bar: a primary row that is always on screen, plus a collapsible panel
 * holding the other six controls.
 *
 * Every parameter the list endpoint documents has a control here. Search,
 * status and type lead, because they are what a person opens this page to ask;
 * the parties and the four date bounds fold away, or the table starts below the
 * fold on a laptop.
 *
 * Status and type are native selects rather than comboboxes: four fixed options
 * each, already cached by `/meta`, and a search box over four items is friction
 * rather than help. The two id filters run to thousands of rows and page as you
 * scroll, which is what `AsyncCombobox` is for.
 *
 * Draft state is held locally and only handed up on Apply, so typing a term or
 * picking a corporate doesn't refetch the list on every keystroke. `value` is
 * mirrored into the draft whenever the applied filters change from outside — a
 * Reset, or a restored URL — keeping the two in step.
 */

export interface ApprovalFiltersProps {
  /** The filters currently applied to the table. */
  value: ApprovalFilterValues;
  onApply: (filters: ApprovalFilterValues) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ApprovalFilters({
  value,
  onApply,
  onReset,
  disabled,
}: ApprovalFiltersProps) {
  const [draft, setDraft] = React.useState<ApprovalFilterValues>(value);
  const { approvalStatusOptions, approvalTypeOptions } = useMetaOptions();

  /**
   * The labels for the two id filters, as picked.
   *
   * The URL carries ids, so a restored link has nothing to render on the
   * trigger — `useLookupLabel` resolves those. A label picked in this session
   * is already known and takes precedence, which saves the lookup entirely.
   */
  const [pickedLabels, setPickedLabels] = React.useState<
    Partial<Record<"corporate_id" | "customer_id", string>>
  >({});

  const resolvedCorporate = useLookupLabel("corporate", draft.corporate_id);
  const resolvedCustomer = useLookupLabel("customer", draft.customer_id);

  const advancedCount = countAdvancedFilters(value);

  /*
   * Open when a restored URL already carries hidden filters. A filter the user
   * cannot see is a filter they will forget is applied — and the first thing
   * they would do is wonder why the queue looks wrong.
   */
  const [expanded, setExpanded] = React.useState(advancedCount > 0);

  /**
   * Re-sync when the applied filters change from outside this component — a
   * Reset, or a restored URL.
   *
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately with the corrected draft and never commits the
   * mismatched pair, so nothing flashes; an effect would paint the stale draft
   * first and then correct it.
   */
  const appliedKey = JSON.stringify(value);
  const [syncedKey, setSyncedKey] = React.useState(appliedKey);
  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey);
    setDraft(value);
    setPickedLabels({});
    if (countAdvancedFilters(value) > 0) setExpanded(true);
  }

  const set = <K extends keyof ApprovalFilterValues>(
    key: K,
    next: ApprovalFilterValues[K],
  ) => setDraft((prev) => ({ ...prev, [key]: next }));

  const setLookup = (
    key: "corporate_id" | "customer_id",
    next: string,
    label?: string,
  ) => {
    set(key, next);
    setPickedLabels((prev) => ({ ...prev, [key]: label }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };

  const dirty = JSON.stringify(draft) !== appliedKey;
  const activeCount = countActiveFilters(value);
  const draftAdvancedCount = countAdvancedFilters(draft);

  /** Shown beside a lookup's label once it holds something. */
  const clearButton = (key: "corporate_id" | "customer_id") =>
    draft[key] ? (
      <button
        type="button"
        onClick={() => setLookup(key, "", undefined)}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
      >
        <X className="size-3" aria-hidden />
        Clear
      </button>
    ) : null;

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Primary row: always on screen ───────────────────────────── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <FilterField
            label="Search"
            htmlFor="approval-q"
            hint="Matches part of the request number"
            className="flex-1"
          >
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="approval-q"
                value={draft.q}
                maxLength={60}
                onChange={(event) => set("q", event.target.value)}
                placeholder="APR-2026…"
                className="h-11 pl-9"
              />
            </div>
          </FilterField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[420px]">
            <FilterField label="Status" htmlFor="approval-status">
              <NativeSelect
                id="approval-status"
                value={draft.status}
                onChange={(event) => set("status", event.target.value)}
                options={[
                  { value: "", label: "Any status" },
                  ...approvalStatusOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
              />
            </FilterField>

            <FilterField label="Type" htmlFor="approval-type">
              <NativeSelect
                id="approval-type"
                value={draft.type}
                onChange={(event) => set("type", event.target.value)}
                options={[
                  { value: "", label: "Any type" },
                  ...approvalTypeOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
              />
            </FilterField>
          </div>
        </div>

        {/* ── Collapsible panel ───────────────────────────────────────── */}
        {expanded ? (
          /*
           * Bounded and scrollable. Six controls stack past a screen at phone
           * width, which would push the table — the thing the page is for —
           * below the fold and make expanding the filters feel like leaving the
           * page. `overscroll-contain` stops a flick inside the panel from
           * carrying on into the page.
           */
          <div className="max-h-[60vh] space-y-5 overflow-y-auto overscroll-contain border-t border-border pr-1 pt-4">
            <FilterGroup title="Parties">
              <FilterField
                label="Corporate"
                hint="Review queue only"
                action={clearButton("corporate_id")}
              >
                <AsyncCombobox
                  value={draft.corporate_id}
                  selectedLabel={
                    pickedLabels.corporate_id ??
                    (draft.corporate_id ? resolvedCorporate : undefined)
                  }
                  onChange={(option) =>
                    setLookup("corporate_id", option.value, option.label)
                  }
                  fetchPage={corporateFetcher}
                  placeholder="Any corporate"
                  searchPlaceholder="Search corporates…"
                  emptyText="No corporates found"
                />
              </FilterField>

              <FilterField
                label="Customer"
                hint="Review queue only"
                action={clearButton("customer_id")}
              >
                <AsyncCombobox
                  value={draft.customer_id}
                  selectedLabel={
                    pickedLabels.customer_id ??
                    (draft.customer_id ? resolvedCustomer : undefined)
                  }
                  onChange={(option) =>
                    setLookup("customer_id", option.value, option.label)
                  }
                  fetchPage={customerFetcher}
                  placeholder="Any customer"
                  searchPlaceholder="Search customers…"
                  emptyText="No customers found"
                />
              </FilterField>
            </FilterGroup>

            <FilterGroup title="Dates">
              <FilterField
                label="Requested from"
                htmlFor="approval-requested-from"
                hint="Inclusive"
              >
                <Input
                  id="approval-requested-from"
                  type="date"
                  value={draft.requested_from}
                  max={draft.requested_to || undefined}
                  onChange={(event) => set("requested_from", event.target.value)}
                />
              </FilterField>

              <FilterField label="Requested to" htmlFor="approval-requested-to">
                <Input
                  id="approval-requested-to"
                  type="date"
                  value={draft.requested_to}
                  // Bounds each other, so the pair cannot be inverted into a
                  // range that matches nothing.
                  min={draft.requested_from || undefined}
                  onChange={(event) => set("requested_to", event.target.value)}
                />
              </FilterField>

              <FilterField
                label="Reviewed from"
                htmlFor="approval-reviewed-from"
                hint="Review queue only"
              >
                <Input
                  id="approval-reviewed-from"
                  type="date"
                  value={draft.reviewed_from}
                  max={draft.reviewed_to || undefined}
                  onChange={(event) => set("reviewed_from", event.target.value)}
                />
              </FilterField>

              <FilterField label="Reviewed to" htmlFor="approval-reviewed-to">
                <Input
                  id="approval-reviewed-to"
                  type="date"
                  value={draft.reviewed_to}
                  min={draft.reviewed_from || undefined}
                  onChange={(event) => set("reviewed_to", event.target.value)}
                />
              </FilterField>
            </FilterGroup>
          </div>
        ) : null}

        {/*
          The action bar sits BELOW the panel, so expanding pushes the buttons
          down past the controls the user just opened rather than leaving Apply
          stranded above six untouched fields.
        */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {activeCount > 0 ? (
              <Badge variant="secondary">
                {activeCount} filter{activeCount === 1 ? "" : "s"} applied
              </Badge>
            ) : (
              <span>
                {value.status === DEFAULT_FILTERS.status
                  ? "Showing requests awaiting approval — the default view"
                  : "Showing every request"}
              </span>
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
              {/* The count lives on the button, not inside the panel — a hidden
                  filter has to announce itself from where it is hidden. */}
              {draftAdvancedCount > 0 ? (
                <Badge variant="secondary">{draftAdvancedCount}</Badge>
              ) : null}
              <ChevronDown
                aria-hidden
                className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </Button>

            {/* Disabled until the draft actually differs, so the button never
                fires a request that would change nothing. */}
            <Button type="submit" disabled={disabled || !dirty}>
              Apply
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={disabled}
            >
              <RotateCcw className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
