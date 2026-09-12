"use client";

import * as React from "react";
import {
  ChevronDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  FilterField,
  FilterGroup,
  TriStateSelect,
  YFlagSelect,
} from "@/shared/components/ui/filter-bar";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";

import {
  countActiveFilters,
  countAdvancedFilters,
  withAssignedTo,
  withConsignment,
  withHasConsignment,
  withOpen,
  withResolved,
  withStatus,
  withUnassigned,
} from "../lib/ticket-params";
import type { TicketFilterValues } from "../types";
import { LookupFilter } from "./lookup-filter";
import {
  assignableFetcher,
  consignmentFetcher,
  corporateFetcher,
  corporateUserFetcher,
  customerFetcher,
} from "./lookup-fetchers";

/**
 * Filter bar: three quick chips, a primary row that is always on screen, and a
 * collapsible panel holding the other sixteen controls.
 *
 * Twenty filters is a lot of surface, so the bar is arranged by how often each
 * question gets asked rather than by the order the API documents them. Search,
 * status, priority and category lead. The chips above them are the three
 * queues someone actually works from — they apply on click, because a queue you
 * have to press Apply to see is a queue you will stop using.
 *
 * Draft state is held locally and handed up on Apply, so typing or picking
 * doesn't refetch on every keystroke. `value` is mirrored into the draft
 * whenever the applied filters change from outside — a Reset, a chip, or a
 * restored URL.
 */

export interface TicketFiltersProps {
  value: TicketFilterValues;
  onApply: (filters: TicketFilterValues) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function TicketFilters({
  value,
  onApply,
  onReset,
  disabled,
}: TicketFiltersProps) {
  const [draft, setDraft] = React.useState<TicketFilterValues>(value);
  const { ticketStatusOptions, ticketPriorityOptions, ticketCategoryOptions } =
    useMetaOptions();

  const advancedCount = countAdvancedFilters(value);

  /*
   * Open when a restored URL already carries hidden filters. A filter the user
   * cannot see is a filter they will forget is applied — and the first thing
   * they would do is wonder why the queue looks wrong.
   */
  const [expanded, setExpanded] = React.useState(advancedCount > 0);

  /**
   * Re-sync when the applied filters change from outside this component.
   *
   * Adjusted during render rather than in an effect: React re-runs this
   * component immediately with the corrected draft and never commits the
   * mismatched pair, so nothing flashes.
   */
  const appliedKey = JSON.stringify(value);
  const [syncedKey, setSyncedKey] = React.useState(appliedKey);
  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey);
    setDraft(value);
    if (countAdvancedFilters(value) > 0) setExpanded(true);
  }

  const set = <K extends keyof TicketFilterValues>(
    key: K,
    next: TicketFilterValues[K],
  ) => setDraft((prev) => ({ ...prev, [key]: next }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(draft);
  };

  const dirty = JSON.stringify(draft) !== appliedKey;
  const activeCount = countActiveFilters(value);
  const draftAdvancedCount = countAdvancedFilters(draft);

  /*
   * Chips act on the *applied* filters, not the draft: they are a shortcut to a
   * queue, and sweeping up a half-typed search term on the way would be a
   * surprise. Toggling one clears it again.
   */
  const quickQueues: { label: string; active: boolean; apply: () => void }[] = [
    {
      label: "Awaiting first response",
      active: value.awaiting_first_response === "true",
      apply: () =>
        onApply({
          ...value,
          awaiting_first_response:
            value.awaiting_first_response === "true" ? "" : "true",
        }),
    },
    {
      label: "Unassigned",
      active: value.unassigned === "Y",
      apply: () => onApply(withUnassigned(value, value.unassigned ? "" : "Y")),
    },
    {
      label: "Open only",
      active: value.open === "Y",
      apply: () => onApply(withOpen(value, value.open ? "" : "Y")),
    },
  ];

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Quick queues ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {quickQueues.map((queue) => (
            <button
              key={queue.label}
              type="button"
              onClick={queue.apply}
              disabled={disabled}
              aria-pressed={queue.active}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                queue.active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {queue.label}
            </button>
          ))}
        </div>


        {/* ── Primary row ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <FilterField
            label="Search"
            htmlFor="ticket-q"
            hint="Matches the ticket number or the subject"
            className="flex-1"
          >
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="ticket-q"
                value={draft.q}
                maxLength={60}
                onChange={(event) => set("q", event.target.value)}
                placeholder="TKT-2026…"
                className="h-11 pl-9"
              />
            </div>
          </FilterField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[560px]">
            <FilterField label="Status" htmlFor="ticket-status">
              <NativeSelect
                id="ticket-status"
                value={draft.status}
                // Picking RESOLVED or CLOSED drops "open only", which means the
                // opposite — the pair would match nothing.
                onChange={(event) =>
                  setDraft((prev) => withStatus(prev, event.target.value))
                }
                options={[
                  { value: "", label: "Any status" },
                  ...ticketStatusOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
              />
            </FilterField>

            <FilterField label="Priority" htmlFor="ticket-priority">
              <NativeSelect
                id="ticket-priority"
                value={draft.priority}
                onChange={(event) => set("priority", event.target.value)}
                options={[
                  { value: "", label: "Any priority" },
                  ...ticketPriorityOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
              />
            </FilterField>

            <FilterField label="Category" htmlFor="ticket-category">
              <NativeSelect
                id="ticket-category"
                value={draft.category}
                onChange={(event) => set("category", event.target.value)}
                options={[
                  { value: "", label: "Any category" },
                  ...ticketCategoryOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
              />
            </FilterField>
          </div>
        </div>

        {/* ── Collapsible panel ────────────────────────────────────────── */}
        {expanded ? (
          /*
           * Bounded and scrollable. Sixteen controls stack several screens deep
           * at phone width, which would push the table — the thing the page is
           * for — out of reach and make expanding the filters feel like leaving
           * the page.
           */
          <div className="max-h-[60vh] space-y-5 overflow-y-auto overscroll-contain border-t border-border pr-1 pt-4">
            <FilterGroup title="Identifiers">
              <FilterField
                label="Ticket no"
                htmlFor="ticket-no"
                hint="Prefix match"
              >
                <Input
                  id="ticket-no"
                  value={draft.ticket_no}
                  maxLength={40}
                  onChange={(event) => set("ticket_no", event.target.value)}
                  placeholder="TKT-2026"
                />
              </FilterField>

              <FilterField
                label="Subject"
                htmlFor="ticket-subject"
                hint="Substring match"
                className="sm:col-span-2"
              >
                <Input
                  id="ticket-subject"
                  value={draft.subject}
                  maxLength={100}
                  onChange={(event) => set("subject", event.target.value)}
                  placeholder="Invoice query"
                />
              </FilterField>
            </FilterGroup>

            <FilterGroup title="People">
              <LookupFilter
                label="Assigned to"
                kind="assignable"
                fetchPage={assignableFetcher}
                value={draft.assigned_to}
                // Owned by someone and owned by nobody cannot both be true.
                onChange={(next) =>
                  setDraft((prev) => withAssignedTo(prev, next))
                }
                placeholder="Anyone"
                searchPlaceholder="Search people…"
                emptyText="No one found"
              />

              <FilterField label="Unassigned" hint="Nobody has picked it up">
                <YFlagSelect
                  value={draft.unassigned}
                  onChange={(next) =>
                    setDraft((prev) => withUnassigned(prev, next))
                  }
                  yesLabel="Unassigned only"
                />
              </FilterField>

              <LookupFilter
                label="Raised by"
                kind="corporateUser"
                fetchPage={corporateUserFetcher}
                value={draft.raised_by}
                onChange={(next) => set("raised_by", next)}
                placeholder="Anyone"
                searchPlaceholder="Search colleagues…"
                emptyText="No one found"
              />
            </FilterGroup>

            <FilterGroup title="Scope">
              <LookupFilter
                label="Corporate"
                // Scope is applied before any filter, so this narrows the
                // caller's own tickets — it cannot reach outside them.
                hint="Narrows within your own tickets"
                kind="corporate"
                fetchPage={corporateFetcher}
                value={draft.corporate_id}
                onChange={(next) => set("corporate_id", next)}
                placeholder="Any corporate"
                searchPlaceholder="Search corporates…"
                emptyText="No corporates found"
              />

              <LookupFilter
                label="Customer"
                kind="customer"
                fetchPage={customerFetcher}
                value={draft.customer_id}
                onChange={(next) => set("customer_id", next)}
                placeholder="Any customer"
                searchPlaceholder="Search customers…"
                emptyText="No customers found"
              />

              <LookupFilter
                label="Consignment"
                hint="Tickets about one shipment"
                kind="consignment"
                fetchPage={consignmentFetcher}
                value={draft.consignment_id}
                onChange={(next) =>
                  setDraft((prev) => withConsignment(prev, next))
                }
                placeholder="Any consignment"
                searchPlaceholder="Search consignments…"
                emptyText="No consignments found"
              />
            </FilterGroup>

            <FilterGroup title="State">
              <FilterField label="Open" hint="Not resolved or closed">
                <YFlagSelect
                  value={draft.open}
                  onChange={(next) => setDraft((prev) => withOpen(prev, next))}
                  yesLabel="Open only"
                />
              </FilterField>

              <FilterField label="Resolved" hint="Has a resolution recorded">
                <TriStateSelect
                  value={draft.resolved}
                  onChange={(next) =>
                    setDraft((prev) => withResolved(prev, next))
                  }
                />
              </FilterField>

              <FilterField label="About a shipment">
                <TriStateSelect
                  value={draft.has_consignment}
                  onChange={(next) =>
                    setDraft((prev) => withHasConsignment(prev, next))
                  }
                />
              </FilterField>

              <FilterField
                label="Awaiting first response"
                hint="Nobody has replied yet"
              >
                <TriStateSelect
                  value={draft.awaiting_first_response}
                  onChange={(next) => set("awaiting_first_response", next)}
                />
              </FilterField>
            </FilterGroup>

            <FilterGroup title="Dates">
              <FilterField
                label="Opened from"
                htmlFor="ticket-created-from"
                hint="Compared on the date, inclusive"
              >
                <Input
                  id="ticket-created-from"
                  type="date"
                  value={draft.created_from}
                  max={draft.created_to || undefined}
                  onChange={(event) => set("created_from", event.target.value)}
                />
              </FilterField>

              <FilterField label="Opened to" htmlFor="ticket-created-to">
                <Input
                  id="ticket-created-to"
                  type="date"
                  value={draft.created_to}
                  // Bounds each other, so the pair cannot be inverted into a
                  // range that matches nothing.
                  min={draft.created_from || undefined}
                  onChange={(event) => set("created_to", event.target.value)}
                />
              </FilterField>

              <FilterField label="Resolved from" htmlFor="ticket-resolved-from">
                <Input
                  id="ticket-resolved-from"
                  type="date"
                  value={draft.resolved_from}
                  max={draft.resolved_to || undefined}
                  onChange={(event) => set("resolved_from", event.target.value)}
                />
              </FilterField>

              <FilterField label="Resolved to" htmlFor="ticket-resolved-to">
                <Input
                  id="ticket-resolved-to"
                  type="date"
                  value={draft.resolved_to}
                  min={draft.resolved_from || undefined}
                  onChange={(event) => set("resolved_to", event.target.value)}
                />
              </FilterField>
            </FilterGroup>
          </div>
        ) : null}

        {/*
          The action bar sits BELOW the panel, so expanding pushes the buttons
          down past the controls the user just opened rather than leaving Apply
          stranded above sixteen untouched fields.
        */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {activeCount > 0 ? (
              <Badge variant="secondary">
                {activeCount} filter{activeCount === 1 ? "" : "s"} applied
              </Badge>
            ) : (
              <span>Showing every ticket</span>
            )}
            {dirty ? (
              <span className="text-amber-600">Unapplied changes</span>
            ) : null}
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
