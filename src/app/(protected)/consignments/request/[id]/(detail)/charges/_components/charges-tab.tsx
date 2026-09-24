"use client";

import * as React from "react";
import { Coins, Eye, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Pagination } from "@/shared/components/ui/pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";

import { useConsignmentPermissions } from "../../../../_hooks/use-consignment-permissions";
import { useConsignmentRequest } from "../../../../_hooks/use-consignment-request";
import {
  useConsignmentCharges,
  useDeleteConsignmentCharge,
} from "../_hooks/use-consignment-charges";
import {
  DEFAULT_CHARGE_FILTERS,
  PER_PAGE_OPTIONS,
  SOURCE_OPTIONS,
  formatAmount,
  type ChargeFilters,
  type ConsignmentCharge,
} from "../types";
import { ChargeFormDialog } from "./charge-form-dialog";
import { ChargeViewDialog } from "./charge-view-dialog";

/**
 * The Charges tab: the cost line items on one consignment request.
 *
 * Filters follow the Apply / Reset pattern: what the user types or picks is a
 * *draft*, and nothing refetches until Apply. Apply stays disabled until the
 * draft differs from what is applied, and Reset returns everything — the page
 * size included — to the defaults.
 *
 * Writes are gated twice: the record must currently accept them
 * (`can_add_charges` / `can_update_charges`) and the user must hold the grant.
 * No separate delete flag is published, so delete follows update.
 */

const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

const COLUMNS = 6;

function sameFilters(a: ChargeFilters, b: ChargeFilters): boolean {
  return (
    a.name.trim() === b.name.trim() &&
    a.quantity_code === b.quantity_code &&
    a.is_system_generated === b.is_system_generated &&
    a.perPage === b.perPage
  );
}

export function ChargesTab({ id }: { id: number }) {
  const requestId = String(id);

  const [page, setPage] = React.useState(1);
  const [draft, setDraft] = React.useState<ChargeFilters>(DEFAULT_CHARGE_FILTERS);
  const [applied, setApplied] = React.useState<ChargeFilters>(DEFAULT_CHARGE_FILTERS);

  const [viewing, setViewing] = React.useState<ConsignmentCharge | null>(null);
  const [editing, setEditing] = React.useState<ConsignmentCharge | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<ConsignmentCharge | null>(null);

  const request = useConsignmentRequest(id);
  const { canAddCharges, canUpdateCharges } = useConsignmentPermissions();
  const query = useConsignmentCharges(requestId, page, applied);
  const deleteCharge = useDeleteConsignmentCharge(requestId);
  const { quantityCodeOptions } = useMetaOptions();

  const record = request.data?.request;
  const canAdd = record?.can_add_charges === true && canAddCharges;
  const canWrite = record?.can_update_charges === true && canUpdateCharges;

  const rows = query.data?.items ?? [];
  const dirty = !sameFilters(draft, applied);
  const filtered = !sameFilters(applied, DEFAULT_CHARGE_FILTERS);

  const unitFilterOptions = [{ value: "", label: "All units" }, ...quantityCodeOptions];

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({ ...draft, name: draft.name.trim() });
    setPage(1);
  }

  function reset() {
    setDraft(DEFAULT_CHARGE_FILTERS);
    setApplied(DEFAULT_CHARGE_FILTERS);
    setPage(1);
  }

  if (query.isLoading) return <ChargesTabSkeleton />;

  if (query.isError) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">Could not load charges</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {isApiError(query.error)
            ? query.error.message
            : "Something went wrong. Please try again."}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  const addButton = canAdd ? (
    <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
      <Plus className="size-4" aria-hidden />
      Add charge
    </Button>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold text-foreground">Charges</h3>
          <p className="text-sm text-muted-foreground">
            Every line making up this request&apos;s cost, system-generated and manual alike
          </p>
        </div>
        {addButton}
      </div>

      {rows.length === 0 && !filtered ? (
        <EmptyState
          icon={Coins}
          title="No charges yet"
          description="Charges added by the pricing engine or by hand will appear here."
          action={addButton ?? undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Filter bar — only the list endpoint's own query params. */}
          <form
            onSubmit={apply}
            className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,11rem))_auto] lg:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="charge-filter-name">Name</Label>
              <Input
                id="charge-filter-name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="e.g. Freight"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="charge-filter-unit">Unit</Label>
              <NativeSelect
                id="charge-filter-unit"
                options={unitFilterOptions}
                value={draft.quantity_code}
                onChange={(event) => setDraft({ ...draft, quantity_code: event.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="charge-filter-source">Source</Label>
              <NativeSelect
                id="charge-filter-source"
                options={SOURCE_OPTIONS}
                value={draft.is_system_generated}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    is_system_generated: event.target.value as ChargeFilters["is_system_generated"],
                  })
                }
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="charge-filter-per-page">Per page</Label>
              <NativeSelect
                id="charge-filter-per-page"
                options={PER_PAGE_OPTIONS}
                value={String(draft.perPage)}
                onChange={(event) => setDraft({ ...draft, perPage: Number(event.target.value) })}
                className="h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!dirty} className="flex-1 lg:flex-none">
                Apply
              </Button>
              <Button type="button" variant="outline" onClick={reset} className="flex-1 lg:flex-none">
                Reset
              </Button>
            </div>
          </form>

          <div className={cn("overflow-x-auto", query.isFetching && "opacity-60 transition-opacity")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Quantity</TableHead>
                  <TableHead className="hidden md:table-cell">Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead className={cn("text-right", STICKY_ACTIONS)}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={COLUMNS}>No charges match these filters.</TableEmpty>
                ) : null}

                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-40 max-w-64">
                      <span className="block truncate font-medium text-foreground">{row.name}</span>
                      {row.description ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.description}
                        </span>
                      ) : null}
                      {/* Carries the dropped columns on small screens. */}
                      <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                        {row.quantity} {optionLabel(quantityCodeOptions, row.quantity_code)} ×{" "}
                        {formatAmount(row.rate)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {row.quantity} {optionLabel(quantityCodeOptions, row.quantity_code)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                      {formatAmount(row.rate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-foreground">
                      {formatAmount(row.amount)} {row.currency ?? ""}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={row.is_system_generated === "Y" ? "secondary" : "outline"}>
                        {row.is_system_generated === "Y" ? "System" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className={STICKY_ACTIONS}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewing(row)}
                          className="size-7 text-muted-foreground hover:text-primary"
                        >
                          <Eye className="size-3.5" aria-hidden />
                          <span className="sr-only">View this charge</span>
                        </Button>
                        {canWrite ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(row)}
                              className="size-7 text-muted-foreground hover:text-primary"
                            >
                              <Pencil className="size-3.5" aria-hidden />
                              <span className="sr-only">Edit this charge</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(row)}
                              className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              <span className="sr-only">Delete this charge</span>
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            meta={query.data?.meta}
            onPageChange={setPage}
            disabled={query.isFetching}
            className="px-4"
          />
        </Card>
      )}

      <ChargeViewDialog
        requestId={requestId}
        charge={viewing}
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      {/* Two mounts so opening the editor never inherits a half-filled create form. */}
      <ChargeFormDialog
        requestId={requestId}
        charge={null}
        open={creating}
        onOpenChange={setCreating}
      />
      <ChargeFormDialog
        requestId={requestId}
        charge={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this charge?"
        description={
          pendingDelete
            ? `${pendingDelete.name} · ${formatAmount(pendingDelete.amount)}. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteCharge.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
          // Deleting the only row on the last page would strand the user there.
          if (rows.length === 1 && page > 1) setPage((current) => current - 1);
        }}
      />
    </div>
  );
}

export function ChargesTabSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </Card>
  );
}
