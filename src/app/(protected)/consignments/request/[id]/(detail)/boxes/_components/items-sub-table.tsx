"use client";

import * as React from "react";
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

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

import { useBoxItems, useDeleteItem } from "../_hooks/use-consignment-boxes";
import type { ConsignmentBoxItemDetail } from "../../../../types";
import { DetailDialog, type DetailRow } from "./detail-dialog";
import { ItemFormDialog } from "./item-form-dialog";
import type { BoxPermissions } from "./boxes-manager";

/**
 * The items inside one box, shown when its row is expanded.
 *
 * Loaded on expand rather than with the box list: a request with twenty boxes
 * would otherwise make twenty extra requests for tables nobody has opened.
 * `useBoxItems` is disabled until this component mounts, which is exactly the
 * moment the user asked to see them.
 */

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
  const [viewing, setViewing] = React.useState<ConsignmentBoxItemDetail | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentBoxItemDetail | null>(null);

  const items = data?.items ?? [];

  const viewRows: DetailRow[] = viewing
    ? [
        { label: "Name", value: viewing.item_name, full: true },
        { label: "HS code", value: viewing.item_hs_code },
        { label: "Material", value: viewing.item_material },
        { label: "Manufacturer", value: viewing.item_manufacturer },
        {
          label: "Gender",
          value: optionLabel(genderOptions, viewing.item_gender),
        },
        {
          label: "Quantity",
          value: `${viewing.item_quantity ?? ""} ${optionLabel(
            quantityCodeOptions,
            viewing.item_quantity_code,
          )}`.trim(),
        },
        { label: "Rate", value: viewing.item_rate },
        { label: "Total amount", value: viewing.item_total_amount },
        { label: "Currency", value: viewing.item_currency },
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
                <TableCell colSpan={9} className="py-8 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableEmpty colSpan={9}>No items in this box yet.</TableEmpty>
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
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setViewing(item)}
                        aria-label={`View ${item.item_name}`}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      {permissions.canUpdateItems && item.id ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDialog({ itemId: item.id })}
                          aria-label={`Edit ${item.item_name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      ) : null}
                      {permissions.canDeleteItems && item.id ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setPendingDelete(item)}
                          aria-label={`Delete ${item.item_name}`}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
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
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        title="Item details"
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
