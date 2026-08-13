"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { useBoxItem, useSaveItem } from "../_hooks/use-consignment-boxes";
import { DEFAULT_CURRENCY, DEFAULT_QUANTITY_CODE } from "../schema";
import type { ItemWritePayload } from "../types";
import { FieldShell } from "./field-shell";
import {
  currencyFetcher,
  hsCodeFetcher,
  manufacturerFetcher,
  materialFetcher,
} from "./lookup-fetchers";

/**
 * Add or edit one item inside a box. Same shape as `BoxFormDialog` — plain
 * state, string-held fields, validated on submit — for the same reasons.
 *
 * One rename to watch: the API *returns* `item_quantity` and *accepts*
 * `quantity`. Both appear below, and they are the same number.
 */

interface FormState {
  item_name: string;
  item_hs_code: string;
  item_hs_code_label: string;
  item_material: string;
  item_material_label: string;
  item_manufacturer: string;
  item_manufacturer_label: string;
  item_gender: string;
  quantity: string;
  item_quantity_code: string;
  item_rate: string;
  item_total_amount: string;
  item_currency: string;
  item_currency_label: string;
}

const EMPTY_FORM: FormState = {
  item_name: "",
  item_hs_code: "",
  item_hs_code_label: "",
  item_material: "",
  item_material_label: "",
  item_manufacturer: "",
  item_manufacturer_label: "",
  item_gender: "",
  quantity: "",
  item_quantity_code: DEFAULT_QUANTITY_CODE,
  item_rate: "",
  item_total_amount: "",
  item_currency: DEFAULT_CURRENCY,
  item_currency_label: DEFAULT_CURRENCY,
};

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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

  const { quantityCodeOptions, genderOptions } = useMetaOptions();
  const item = useBoxItem(consignmentId, boxId, isEdit ? itemId : undefined);
  const saveItem = useSaveItem(consignmentId, boxId);

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Seed once per record — see `BoxFormDialog` for why this is not an effect on
  // `item.data` alone.
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
      setForm(EMPTY_FORM);
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
      item_hs_code_label: text(record.item_hs_code),
      item_material: text(record.item_material),
      item_material_label: text(record.item_material),
      item_manufacturer: text(record.item_manufacturer),
      item_manufacturer_label: text(record.item_manufacturer),
      item_gender: text(record.item_gender),
      // Read as `item_quantity`, written back as `quantity`.
      quantity: text(record.item_quantity),
      item_quantity_code: text(record.item_quantity_code) || DEFAULT_QUANTITY_CODE,
      item_rate: text(record.item_rate),
      item_total_amount: text(record.item_total_amount),
      item_currency: text(record.item_currency) || DEFAULT_CURRENCY,
      item_currency_label: text(record.item_currency) || DEFAULT_CURRENCY,
    });
  }, [open, isEdit, itemId, item.data]);

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!form.item_name.trim()) next.item_name = "Item name is required";

    const quantity = toNumber(form.quantity);
    if (quantity === undefined || quantity <= 0) {
      next.quantity = "Quantity must be at least 1";
    }
    if (!form.item_quantity_code) {
      next.item_quantity_code = "Quantity code is required";
    }

    const rate = toNumber(form.item_rate);
    if (rate === undefined || rate < 0) next.item_rate = "Rate is required";

    const total = toNumber(form.item_total_amount);
    if (total === undefined || total < 0) {
      next.item_total_amount = "Total amount is required";
    }

    if (!form.item_currency) next.item_currency = "Currency is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    const payload: ItemWritePayload = {
      item_name: form.item_name.trim(),
      item_hs_code: form.item_hs_code || undefined,
      item_material: form.item_material || undefined,
      item_manufacturer: form.item_manufacturer || undefined,
      item_gender: form.item_gender || undefined,
      quantity: toNumber(form.quantity),
      item_quantity_code: form.item_quantity_code,
      item_rate: toNumber(form.item_rate),
      item_total_amount: toNumber(form.item_total_amount),
      item_currency: form.item_currency,
    };

    saveItem.mutate({ itemId, payload }, { onSuccess: onClose });
  }

  const fieldError = (name: string): string | undefined =>
    errors[name] ??
    (isApiError(saveItem.error) ? saveItem.error.fieldError(name) : undefined);

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
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldShell
                label="Item name"
                required
                error={fieldError("item_name")}
                className="sm:col-span-2"
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    placeholder="iPhone 14 case"
                    value={form.item_name}
                    onChange={(event) => set("item_name", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={fieldError("item_name") ? true : undefined}
                  />
                )}
              </FieldShell>

              <FieldShell label="HS code" hint="Optional">
                {() => (
                  <AsyncCombobox
                    value={form.item_hs_code}
                    selectedLabel={form.item_hs_code_label}
                    onChange={(option) =>
                      setForm((current) => ({
                        ...current,
                        item_hs_code: option.value,
                        item_hs_code_label: option.label,
                      }))
                    }
                    fetchPage={hsCodeFetcher}
                    placeholder="Select or type an HS code"
                    searchPlaceholder="Search HS codes…"
                    allowCustomValue
                  />
                )}
              </FieldShell>

              <FieldShell label="Material" hint="Optional">
                {() => (
                  <AsyncCombobox
                    value={form.item_material}
                    selectedLabel={form.item_material_label}
                    onChange={(option) =>
                      setForm((current) => ({
                        ...current,
                        item_material: option.value,
                        item_material_label: option.label,
                      }))
                    }
                    fetchPage={materialFetcher}
                    placeholder="Select or type a material"
                    searchPlaceholder="Search materials…"
                    allowCustomValue
                  />
                )}
              </FieldShell>

              <FieldShell label="Manufacturer" hint="Optional">
                {() => (
                  <AsyncCombobox
                    value={form.item_manufacturer}
                    selectedLabel={form.item_manufacturer_label}
                    onChange={(option) =>
                      setForm((current) => ({
                        ...current,
                        item_manufacturer: option.value,
                        item_manufacturer_label: option.label,
                      }))
                    }
                    fetchPage={manufacturerFetcher}
                    placeholder="Select or type a manufacturer"
                    searchPlaceholder="Search manufacturers…"
                    allowCustomValue
                  />
                )}
              </FieldShell>

              <FieldShell label="Gender" hint="For apparel and footwear">
                {() => (
                  <Combobox
                    options={genderOptions}
                    value={form.item_gender}
                    onChange={(value) => set("item_gender", value)}
                    placeholder="Select gender"
                    searchPlaceholder="Search…"
                    allowCustomValue={false}
                  />
                )}
              </FieldShell>

              <FieldShell label="Quantity" required error={fieldError("quantity")}>
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) => set("quantity", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={fieldError("quantity") ? true : undefined}
                  />
                )}
              </FieldShell>

              <FieldShell
                label="Quantity code"
                required
                error={fieldError("item_quantity_code")}
              >
                {() => (
                  <Combobox
                    options={quantityCodeOptions}
                    value={form.item_quantity_code}
                    onChange={(value) => set("item_quantity_code", value)}
                    placeholder="Select or type a code"
                    searchPlaceholder="Search codes…"
                    allowCustomValue
                    aria-invalid={Boolean(fieldError("item_quantity_code"))}
                  />
                )}
              </FieldShell>

              <FieldShell label="Rate" required error={fieldError("item_rate")}>
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.item_rate}
                    onChange={(event) => set("item_rate", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={fieldError("item_rate") ? true : undefined}
                  />
                )}
              </FieldShell>

              <FieldShell
                label="Total amount"
                required
                error={fieldError("item_total_amount")}
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.item_total_amount}
                    onChange={(event) =>
                      set("item_total_amount", event.target.value)
                    }
                    aria-describedby={describedBy}
                    aria-invalid={
                      fieldError("item_total_amount") ? true : undefined
                    }
                  />
                )}
              </FieldShell>

              <FieldShell
                label="Currency"
                required
                error={fieldError("item_currency")}
              >
                {() => (
                  <AsyncCombobox
                    value={form.item_currency}
                    selectedLabel={form.item_currency_label}
                    onChange={(option) =>
                      setForm((current) => ({
                        ...current,
                        item_currency: option.value,
                        item_currency_label: option.label,
                      }))
                    }
                    fetchPage={currencyFetcher}
                    placeholder="Select currency"
                    searchPlaceholder="Search currencies…"
                    allowCustomValue
                    aria-invalid={Boolean(fieldError("item_currency"))}
                  />
                )}
              </FieldShell>
            </div>

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
