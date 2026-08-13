"use client";

import * as React from "react";
import { Eye, Loader2, Plus } from "lucide-react";
// Edit and delete are commented out in the action cell below.
// import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
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

import {
  useBoxItem,
  useBoxItems,
  useDeleteItem,
} from "../_hooks/use-consignment-boxes";
import type { ConsignmentBoxItemDetail } from "../types";
import type { BoxPermissions } from "./boxes-manager";
import { DetailDialog, type DetailRow } from "./detail-dialog";
import { ItemFormDialog } from "./item-form-dialog";

/**
 * The items inside one box, shown when its row is expanded.
 *
 * Loaded on expand rather than with the box list: a consignment with twenty
 * boxes would otherwise make twenty extra requests for tables nobody has
 * opened. `useBoxItems` is disabled until this component mounts, which is
 * exactly the moment the user asked to see them.
 */

const COLUMNS = 9;

export interface ItemsSubTableProps {
  consignmentId: number | string;
  boxId: number;
  permissions: BoxPermissions;
}

export function ItemsSubTable({
  consignmentId,
  boxId,
  permissions,
}: ItemsSubTableProps) {
  const { genderOptions, quantityCodeOptions } = useMetaOptions();

  const { data, isPending } = useBoxItems(consignmentId, boxId);
  const deleteItem = useDeleteItem(consignmentId, boxId);

  const [dialog, setDialog] = React.useState<{ itemId?: number } | null>(null);
  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentBoxItemDetail | null>(null);

  /**
   * The item being viewed, held as an **id** rather than the row object.
   *
   * `GET …/boxes/{boxId}/items/{itemId}` is what fills the dialog — not the row
   * the user clicked. The list endpoint returns a summary; the detail endpoint
   * is the only thing that promises the whole record.
   */
  const [viewingItemId, setViewingItemId] = React.useState<number | null>(null);

  const viewItem = useBoxItem(consignmentId, boxId, viewingItemId ?? undefined);

  const items = data?.items ?? [];

  // Built from the fetched record, so the dialog shows every field the detail
  // endpoint returns rather than the subset the list carried.
  const viewed = viewItem.data;
  const viewRows: DetailRow[] = viewed
    ? [
        { label: "Name", value: viewed.item_name, full: true },
        { label: "HS code", value: viewed.item_hs_code },
        { label: "Material", value: viewed.item_material },
        { label: "Manufacturer", value: viewed.item_manufacturer },
        {
          label: "Gender",
          value: optionLabel(genderOptions, viewed.item_gender),
        },
        {
          label: "Quantity",
          value: `${viewed.item_quantity ?? ""} ${optionLabel(
            quantityCodeOptions,
            viewed.item_quantity_code,
          )}`.trim(),
        },
        { label: "Rate", value: viewed.item_rate },
        { label: "Total amount", value: viewed.item_total_amount },
        { label: "Currency", value: viewed.item_currency },
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Items ({items.length})
        </p>
        {permissions.canAddItems ? (
          <Button variant="outline" size="sm" onClick={() => setDialog({})}>
            <Plus className="size-3.5" />
            Add item
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">HS code</TableHead>
              <TableHead className="hidden lg:table-cell">Material</TableHead>
              <TableHead className="hidden xl:table-cell">Manufacturer</TableHead>
              <TableHead className="hidden lg:table-cell">Gender</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead className="hidden sm:table-cell">Rate</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="py-8 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableEmpty colSpan={COLUMNS}>No items in this box yet.</TableEmpty>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.id ?? index}>
                  <TableCell className="font-medium text-foreground">
                    {item.item_name || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {item.item_hs_code || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {item.item_material || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground xl:table-cell">
                    {item.item_manufacturer || "—"}
                  </TableCell>
                  {/* Stored as a code (`MALE`); `/meta` carries its label. */}
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {optionLabel(genderOptions, item.item_gender) || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {String(item.item_quantity ?? "—")}{" "}
                    {optionLabel(quantityCodeOptions, item.item_quantity_code)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {String(item.item_rate ?? "—")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {String(item.item_total_amount ?? "—")} {item.item_currency}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {/* Passes the id, not the row — the dialog fetches
                          `…/boxes/{boxId}/items/{itemId}` for itself. */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setViewingItemId(item.id ?? null)}
                        disabled={!item.id}
                        aria-label={`View ${item.item_name}`}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      {/* {permissions.canUpdateItems && item.id ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDialog({ itemId: item.id })}
                          aria-label={`Edit ${item.item_name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      ) : null} */}
                      {/* {permissions.canDeleteItems && item.id ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setPendingDelete(item)}
                          aria-label={`Delete ${item.item_name}`}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null} */}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {dialog ? (
        <ItemFormDialog
          open
          onClose={() => setDialog(null)}
          consignmentId={consignmentId}
          boxId={boxId}
          itemId={dialog.itemId}
        />
      ) : null}

      <DetailDialog
        open={viewingItemId !== null}
        onOpenChange={(open) => !open && setViewingItemId(null)}
        title="Item details"
        // The request only starts when the dialog opens, so the spinner is the
        // honest first state rather than a flash of the previous item.
        loading={viewItem.isPending}
        rows={viewRows}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this item?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete.item_name}
              </span>{" "}
              will be removed from this box. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete item"
        onConfirm={async () => {
          if (pendingDelete?.id) await deleteItem.mutateAsync(pendingDelete.id);
        }}
      />
    </div>
  );
}
