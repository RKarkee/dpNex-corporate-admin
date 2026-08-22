"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { useBoxItem, useSaveItem } from "../_hooks/use-consignment-boxes";
import { DEFAULT_CURRENCY, DEFAULT_QUANTITY_CODE } from "../../../../schema";
import {
  EMPTY_ITEM_FORM,
  ItemFields,
  toItemPayload,
  validateItemForm,
  type ItemFormState,
} from "./item-fields";

/**
 * Add or edit one item inside a box that already exists.
 *
 * The fields, their validation and the payload mapping all live in
 * `item-fields.tsx`, shared with `BoxFormDialog` — which composes items for a
 * box being created, where there is no box id to post them against yet. This
 * dialog owns only the parts that differ: loading the record, and saving it
 * through the item endpoints.
 */

export interface ItemFormDialogProps {
  open: boolean;
  onClose: () => void;
  consignmentId: number | string;
  boxId: number;
  /** Absent for a create. */
  itemId?: number;
}

export function ItemFormDialog({
  open,
  onClose,
  consignmentId,
  boxId,
  itemId,
}: ItemFormDialogProps) {
  const isEdit = itemId !== undefined;

  const item = useBoxItem(consignmentId, boxId, isEdit ? itemId : undefined);
  const saveItem = useSaveItem(consignmentId, boxId);

  const [form, setForm] = React.useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const patch = (next: Partial<ItemFormState>) =>
    setForm((current) => ({ ...current, ...next }));

  // Seed once per record — see `BoxFormDialog` for why this is not an effect
  // on `item.data` alone.
  const seededFor = React.useRef<number | "create" | null>(null);

  React.useEffect(() => {
    if (!open) {
      seededFor.current = null;
      return;
    }

    if (!isEdit) {
      if (seededFor.current === "create") return;
      seededFor.current = "create";
      setErrors({});
      setForm(EMPTY_ITEM_FORM);
      return;
    }

    const record = item.data;
    if (!record || seededFor.current === itemId) return;

    seededFor.current = itemId;
    setErrors({});

    const text = (value: unknown) =>
      value === null || value === undefined ? "" : String(value);

    setForm({
      item_name: text(record.item_name),
      item_hs_code: text(record.item_hs_code),
      // The `*_label` fields are left blank on purpose: `useLookupLabel` turns
      // each stored code into its name. Seeding them with the code would win
      // over the resolved label and pin every trigger to the raw value.
      item_hs_code_label: "",
      item_material: text(record.item_material),
      item_material_label: "",
      item_manufacturer: text(record.item_manufacturer),
      item_manufacturer_label: "",
      item_gender: text(record.item_gender),
      // Read as `item_quantity`, written back as `quantity`.
      quantity: text(record.item_quantity),
      item_quantity_code:
        text(record.item_quantity_code) || DEFAULT_QUANTITY_CODE,
      item_rate: text(record.item_rate),
      item_total_amount: text(record.item_total_amount),
      item_currency: text(record.item_currency) || DEFAULT_CURRENCY,
      item_currency_label: "",
    });
  }, [open, isEdit, itemId, item.data]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const problems = validateItemForm(form);
    setErrors(problems);
    if (Object.keys(problems).length) return;

    saveItem.mutate(
      { itemId, payload: toItemPayload(form) },
      { onSuccess: onClose },
    );
  }

  /** Client-side message first, then anything the API flagged for this field. */
  const fieldErrors: Record<string, string | undefined> = React.useMemo(() => {
    const merged: Record<string, string | undefined> = { ...errors };
    if (isApiError(saveItem.error)) {
      for (const name of Object.keys(saveItem.error.fieldErrors ?? {})) {
        merged[name] ??= saveItem.error.fieldError(name);
      }
    }
    return merged;
  }, [errors, saveItem.error]);

  const loadingRecord = isEdit && item.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "Add item"}</DialogTitle>
        </DialogHeader>

        {loadingRecord ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading item…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <ItemFields
              value={form}
              onChange={patch}
              errors={fieldErrors}
              disabled={saveItem.isPending}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saveItem.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveItem.isPending}>
                {saveItem.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isEdit ? "Save changes" : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
