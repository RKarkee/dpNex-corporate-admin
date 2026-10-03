"use client";

import * as React from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { FilterField, FilterGroup, TriStateSelect } from "@/shared/components/ui/filter-bar";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";

import {
  BULK_UPLOAD_PER_PAGE_OPTIONS,
  BULK_UPLOAD_STATUSES,
  countAdvancedBulkUploadFilters,
  countBulkUploadFilters,
  type BulkUploadFilterValues,
} from "../../_lib/bulk-upload-params";
import { humanize } from "./bulk-upload-format";

interface BatchesFilterBarProps {
  /** The filters currently applied to the list. */
  value: BulkUploadFilterValues;
  onApply: (filters: BulkUploadFilterValues) => void;
  onReset: () => void;
  /** Rows per page — not a filter, so it applies at once rather than waiting for Apply. */
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  disabled?: boolean;
}

/**
 * The uploads list's filter bar — the same shape as the Support Tickets and
 * Approval Requests bars: search plus the default filters always on screen,
 * the rest in a bounded "More filters" panel, and an action bar with the
 * applied count, Apply (only when something changed) and Clear. The first row
 * also carries Rows per page, which applies straight away.
 *
 * Draft state is local and handed up only on Apply; `value` is mirrored back
 * into the draft whenever the applied filters change from outside.
 */
export function BatchesFilterBar({
  value,
  onApply,
  onReset,
  perPage,
  onPerPageChange,
  disabled,
}: BatchesFilterBarProps) {
  const [draft, setDraft] = React.useState<BulkUploadFilterValues>(value);
  // Open when a restored URL already carries hidden filters.
  const [expanded, setExpanded] = React.useState(countAdvancedBulkUploadFilters(value) > 0);

  // Mirror the applied filters back into the draft when they change from
  // outside (Clear, a restored URL) — the "adjust state on change" pattern.
  const appliedKey = JSON.stringify(value);
  const [syncedKey, setSyncedKey] = React.useState(appliedKey);
  if (appliedKey !== syncedKey) {
    setSyncedKey(appliedKey);
    setDraft(value);
    if (countAdvancedBulkUploadFilters(value) > 0) setExpanded(true);
  }

  const set = <K extends keyof BulkUploadFilterValues>(key: K, next: BulkUploadFilterValues[K]) =>
    setDraft((prev) => ({ ...prev, [key]: next }));

  /** The API rejects a "to" before the "from"; moving "from" past "to" clears "to". */
  const setFrom = (next: string) =>
    setDraft((prev) => ({
      ...prev,
      created_from: next,
      created_to: prev.created_to && next && prev.created_to < next ? "" : prev.created_to,
    }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };

  const dirty = JSON.stringify(draft) !== appliedKey;
  const activeCount = countBulkUploadFilters(value);
  const draftAdvancedCount = countAdvancedBulkUploadFilters(draft);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border p-4 sm:p-5">
      {/* ── Primary row ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <FilterField label="Search" htmlFor="bulk-search" className="flex-1">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="bulk-search"
              value={draft.search}
              maxLength={60}
              onChange={(event) => set("search", event.target.value)}
              placeholder="Batch code or file name…"
              className="h-11 pl-9"
            />
          </div>
        </FilterField>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[600px]">
          <FilterField label="Status" htmlFor="bulk-status">
            <NativeSelect
              id="bulk-status"
              value={draft.status}
              onChange={(event) => set("status", event.target.value)}
              options={[
                { value: "", label: "Any status" },
                ...BULK_UPLOAD_STATUSES.map((status) => ({
                  value: status,
                  label: humanize(status.toLowerCase()),
                })),
              ]}
            />
          </FilterField>

          <FilterField label="Progress" htmlFor="bulk-finished">
            <TriStateSelect
              id="bulk-finished"
              value={draft.is_finished}
              onChange={(next) => set("is_finished", next)}
              anyLabel="Any"
              yesLabel="Finished"
              noLabel="Still running"
            />
          </FilterField>

          {/* Alone on its row at phone width, so it takes the full line. */}
          <FilterField label="Rows per page" htmlFor="bulk-per-page" className="col-span-2 sm:col-span-1">
            <NativeSelect
              id="bulk-per-page"
              value={String(perPage)}
              disabled={disabled}
              onChange={(event) => onPerPageChange(Number(event.target.value))}
              options={BULK_UPLOAD_PER_PAGE_OPTIONS.map((size) => ({
                value: String(size),
                label: `${size} per page`,
              }))}
            />
          </FilterField>
        </div>
      </div>

      {/* ── Collapsible panel ────────────────────────────────────────── */}
      {expanded ? (
        <div className="max-h-[60vh] space-y-5 overflow-y-auto overscroll-contain border-t border-border pr-1 pt-4">
          <FilterGroup title="Results">
            <FilterField label="Has errors" htmlFor="bulk-errors" hint="Rows failed, or the whole upload failed">
              <TriStateSelect
                id="bulk-errors"
                value={draft.has_errors}
                onChange={(next) => set("has_errors", next)}
                anyLabel="Any"
                yesLabel="With errors"
                noLabel="Clean"
              />
            </FilterField>
          </FilterGroup>

          <FilterGroup title="Dates">
            <FilterField label="Uploaded from" htmlFor="bulk-from" hint="Compared on the date, inclusive">
              <Input
                id="bulk-from"
                type="date"
                value={draft.created_from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-11"
              />
            </FilterField>

            <FilterField label="Uploaded to" htmlFor="bulk-to">
              <Input
                id="bulk-to"
                type="date"
                value={draft.created_to}
                min={draft.created_from || undefined}
                onChange={(event) => set("created_to", event.target.value)}
                className="h-11"
              />
            </FilterField>
          </FilterGroup>
        </div>
      ) : null}

      {/* The action bar sits BELOW the panel, so expanding pushes the buttons
          down past the controls just opened. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {activeCount > 0 ? (
            <Badge variant="secondary">
              {activeCount} filter{activeCount === 1 ? "" : "s"} applied
            </Badge>
          ) : (
            <span>Showing every upload</span>
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
            {draftAdvancedCount > 0 ? <Badge variant="secondary">{draftAdvancedCount}</Badge> : null}
            <ChevronDown
              aria-hidden
              className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </Button>

          {/* Disabled until the draft differs, so it never fires a request that would change nothing. */}
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
  );
}
