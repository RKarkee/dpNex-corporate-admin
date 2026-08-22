"use client";

import * as React from "react";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Pagination } from "@/shared/components/ui/pagination";
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

import { useConsignmentBoxes, useDeleteBox } from "../_hooks/use-consignment-boxes";
import type { ConsignmentBoxDetail } from "../../../../types";
import { BoxFormDialog } from "./box-form-dialog";
import { DetailDialog, type DetailRow } from "./detail-dialog";
import { ItemsSubTable } from "./items-sub-table";

/**
 * Boxes on the detail page, each expanding to its items.
 *
 * Separate from the create/edit form on purpose. The form submits the whole
 * request in one body, which is right while it is being composed; once it
 * exists, correcting one box should not mean re-validating and re-submitting
 * every other box and item alongside it. So this talks to the box and item
 * sub-resources directly.
 *
 * Which actions appear is passed in rather than read here, so the same table
 * can render read-only for a request whose status no longer allows edits.
 */

export interface BoxPermissions {
  canAddBoxes?: boolean;
  canUpdateBoxes?: boolean;
  canDeleteBoxes?: boolean;
  canAddItems?: boolean;
  canUpdateItems?: boolean;
  canDeleteItems?: boolean;
}

const COLUMNS = 10;

/** `12.5` → `"12.5"`, `null` → `"—"`. */
function show(value: unknown, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

function dimensions(box: ConsignmentBoxDetail): string {
  const { length, width, height } = box.dimensions ?? {};
  if (!length && !width && !height) return "—";
  return `${length ?? "—"} × ${width ?? "—"} × ${height ?? "—"}`;
}

export interface BoxesManagerProps {
  consignmentId: number | string;
  permissions?: BoxPermissions;
}

export function BoxesManager({
  consignmentId,
  permissions = {},
}: BoxesManagerProps) {
  const { quantityCodeOptions } = useMetaOptions();

  const [page, setPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
  const [dialog, setDialog] = React.useState<{ boxId?: number } | null>(null);
  const [viewing, setViewing] = React.useState<ConsignmentBoxDetail | null>(null);
  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentBoxDetail | null>(null);

  const { data, isPending, isFetching } = useConsignmentBoxes(consignmentId, page);
  const deleteBox = useDeleteBox(consignmentId);

  const boxes = data?.boxes ?? [];
  const total = data?.meta?.total ?? boxes.length;

  const toggle = (boxId: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(boxId)) next.delete(boxId);
      else next.add(boxId);
      return next;
    });

  // Continues the sequence rather than restarting at 1, so numbering stays
  // meaningful after a box in the middle is removed.
  const nextBoxNo =
    boxes.reduce((highest, box) => Math.max(highest, Number(box.box_no) || 0), 0) +
    1;

  const viewRows: DetailRow[] = viewing
    ? [
        { label: "Box no.", value: viewing.box_no },
        { label: "Weight", value: show(viewing.weight, " kg") },
        { label: "Volumetric weight", value: viewing.volumetric_weight },
        { label: "Dimensions (L × W × H)", value: dimensions(viewing) },
        { label: "Pieces", value: viewing.no_of_pcs },
        {
          label: "Quantity code",
          value: optionLabel(quantityCodeOptions, viewing.quantity_code),
        },
        { label: "HS code", value: viewing.hs_code },
        {
          label: "Declared value",
          value: `${show(viewing.declared_value)} ${
            viewing.declared_currency ?? ""
          }`.trim(),
        },
        { label: "Goods description", value: viewing.goods_desc, full: true },
      ]
    : [];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Boxes aria-hidden className="size-4 text-primary" />
            Boxes ({total})
          </h2>
          {permissions.canAddBoxes ? (
            <Button size="sm" onClick={() => setDialog({})}>
              <Plus className="size-4" />
              Add box
            </Button>
          ) : null}
        </div>

        <div className={isFetching && !isPending ? "opacity-60" : undefined}>
          <Table>
            <TableHeader>
              <TableRow className="bg-card hover:bg-transparent">
                {/* No header text: the column holds the expand toggle, and a
                    label for it would be read out on every row. */}
                <TableHead className="w-10" />
                <TableHead>Box</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="hidden lg:table-cell">Volumetric</TableHead>
                <TableHead className="hidden xl:table-cell">L × W × H</TableHead>
                <TableHead className="hidden sm:table-cell">Pieces</TableHead>
                <TableHead className="hidden lg:table-cell">Qty code</TableHead>
                <TableHead className="hidden md:table-cell">HS code</TableHead>
                <TableHead>Declared</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-10 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : boxes.length === 0 ? (
                <TableEmpty colSpan={COLUMNS}>
                  No boxes on this request yet.
                </TableEmpty>
              ) : (
                boxes.map((box, index) => {
                  // The API always sends an id; the index is a last resort so
                  // a malformed row still renders instead of collapsing keys.
                  const boxId = box.id ?? index;
                  const isOpen = expanded.has(boxId);

                  return (
                    <React.Fragment key={boxId}>
                      <TableRow className="bg-card">
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggle(boxId)}
                            aria-expanded={isOpen}
                            aria-label={
                              isOpen
                                ? `Hide items in box ${box.box_no}`
                                : `Show items in box ${box.box_no}`
                            }
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {isOpen ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="font-medium text-foreground">
                          {box.box_no}
                          <p className="text-xs font-normal text-muted-foreground">
                            {box.items?.length ?? 0} item
                            {(box.items?.length ?? 0) === 1 ? "" : "s"}
                          </p>
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {show(box.weight, " kg")}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {show(box.volumetric_weight)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                          {dimensions(box)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {show(box.no_of_pcs)}
                        </TableCell>
                        {/* The stored value is a code (`PCS`); `/meta` carries
                            the name to show for it. */}
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                          {optionLabel(quantityCodeOptions, box.quantity_code) || "—"}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {show(box.hs_code)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {show(box.declared_value)} {box.declared_currency ?? ""}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setViewing(box)}
                              aria-label={`View box ${box.box_no}`}
                            >
                              <Eye className="size-4" />
                            </Button>
                            {permissions.canUpdateBoxes && box.id ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDialog({ boxId: box.id })}
                                aria-label={`Edit box ${box.box_no}`}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            ) : null}
                            {permissions.canDeleteBoxes && box.id ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setPendingDelete(box)}
                                aria-label={`Delete box ${box.box_no}`}
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>

                      {isOpen ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={COLUMNS} className="bg-secondary/40 p-4">
                            <ItemsSubTable
                              consignmentId={consignmentId}
                              boxId={boxId}
                              permissions={permissions}
                            />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {data?.meta && data.meta.pageCount > 1 ? (
          <div className="border-t border-border px-4">
            <Pagination
              meta={data.meta}
              onPageChange={setPage}
              disabled={isFetching}
            />
          </div>
        ) : null}
      </CardContent>

      {dialog ? (
        <BoxFormDialog
          open
          onClose={() => setDialog(null)}
          consignmentId={consignmentId}
          boxId={dialog.boxId}
          nextBoxNo={nextBoxNo}
        />
      ) : null}

      <DetailDialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        title="Box details"
        rows={viewRows}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this box?"
        description={
          pendingDelete ? (
            <>
              Box{" "}
              <span className="font-medium text-foreground">
                {pendingDelete.box_no}
              </span>{" "}
              and every item inside it will be removed. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete box"
        onConfirm={async () => {
          if (!pendingDelete?.id) return;
          await deleteBox.mutateAsync(pendingDelete.id);

          // Removing the only row on a trailing page would leave an empty
          // table; decided here, where the row count is known.
          if (boxes.length === 1 && page > 1) setPage(page - 1);
        }}
      />
    </Card>
  );
}
