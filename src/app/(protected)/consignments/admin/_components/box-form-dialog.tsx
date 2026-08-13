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

import { useConsignmentBox, useSaveBox } from "../_hooks/use-consignment-boxes";
import { DEFAULT_CURRENCY, DEFAULT_QUANTITY_CODE } from "../schema";
import type { BoxWritePayload } from "../types";
import { FieldShell } from "./field-shell";
import { currencyFetcher, hsCodeFetcher } from "./lookup-fetchers";

/**
 * Add or edit one box on an existing consignment.
 *
 * Plain `useState` rather than react-hook-form: eleven flat fields with no
 * arrays and no cross-field rules, in a dialog that unmounts between uses. The
 * big form earns its resolver; this does not.
 *
 * Every field is held as a string — that is what an `<input>` gives back, and
 * keeping numbers as strings until submit is what lets a field be genuinely
 * empty rather than `0`.
 */

interface FormState {
  box_no: string;
  weight: string;
  volumetric_weight: string;
  length: string;
  width: string;
  height: string;
  no_of_pcs: string;
  goods_desc: string;
  hs_code: string;
  hs_code_label: string;
  quantity_code: string;
  declared_currency: string;
  declared_currency_label: string;
  declared_value: string;
}

const EMPTY_FORM: FormState = {
  box_no: "",
  weight: "",
  volumetric_weight: "",
  length: "",
  width: "",
  height: "",
  no_of_pcs: "",
  goods_desc: "",
  hs_code: "",
  hs_code_label: "",
  quantity_code: DEFAULT_QUANTITY_CODE,
  declared_currency: DEFAULT_CURRENCY,
  declared_currency_label: DEFAULT_CURRENCY,
  declared_value: "",
};

/** `""` stays `undefined`, so an untouched field is omitted rather than zeroed. */
function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface BoxFormDialogProps {
  open: boolean;
  onClose: () => void;
  consignmentId: number | string;
  /** Absent for a create. */
  boxId?: number;
  /** Pre-fills the number for a new box, so the user rarely has to think. */
  nextBoxNo?: number;
}

export function BoxFormDialog({
  open,
  onClose,
  consignmentId,
  boxId,
  nextBoxNo,
}: BoxFormDialogProps) {
  const isEdit = boxId !== undefined;

  const { quantityCodeOptions } = useMetaOptions();
  const box = useConsignmentBox(consignmentId, isEdit ? boxId : undefined);
  const saveBox = useSaveBox(consignmentId);

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  /**
   * Seed once per record. The dialog mounts before its box arrives, and
   * re-seeding on every render of `box.data` would discard the user's edits
   * each time React Query refetched in the background.
   */
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
      setForm({ ...EMPTY_FORM, box_no: nextBoxNo ? String(nextBoxNo) : "" });
      return;
    }

    const record = box.data;
    if (!record || seededFor.current === boxId) return;

    seededFor.current = boxId;
    setErrors({});

    const dimensions = record.dimensions ?? {};
    const text = (value: unknown) =>
      value === null || value === undefined ? "" : String(value);

    setForm({
      box_no: text(record.box_no),
      weight: text(record.weight),
      volumetric_weight: text(record.volumetric_weight),
      length: text(dimensions.length),
      width: text(dimensions.width),
      height: text(dimensions.height),
      no_of_pcs: text(record.no_of_pcs),
      goods_desc: text(record.goods_desc),
      hs_code: text(record.hs_code),
      // Seeded with the code: the readable name lives behind a lookup this
      // dialog has no reason to run just to render a trigger.
      hs_code_label: text(record.hs_code),
      quantity_code: text(record.quantity_code) || DEFAULT_QUANTITY_CODE,
      declared_currency: text(record.declared_currency) || DEFAULT_CURRENCY,
      declared_currency_label: text(record.declared_currency) || DEFAULT_CURRENCY,
      declared_value: text(record.declared_value),
    });
  }, [open, isEdit, boxId, box.data, nextBoxNo]);

  /** The same rules the main form's schema applies to a box. */
  function validate(): boolean {
    const next: Record<string, string> = {};

    const weight = toNumber(form.weight);
    if (weight === undefined || weight <= 0) {
      next.weight = "Weight must be greater than 0";
    }

    const pieces = toNumber(form.no_of_pcs);
    if (pieces === undefined || pieces <= 0) {
      next.no_of_pcs = "There must be at least one piece";
    }

    if (!form.goods_desc.trim()) {
      next.goods_desc = "Goods description is required";
    }
    if (!form.quantity_code) next.quantity_code = "Quantity code is required";
    if (!form.declared_currency) next.declared_currency = "Currency is required";

    const declared = toNumber(form.declared_value);
    if (declared === undefined || declared < 0) {
      next.declared_value = "Declared value is required";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    const payload: BoxWritePayload = {
      box_no: toNumber(form.box_no),
      weight: toNumber(form.weight),
      volumetric_weight: toNumber(form.volumetric_weight),
      length: toNumber(form.length),
      width: toNumber(form.width),
      height: toNumber(form.height),
      no_of_pcs: toNumber(form.no_of_pcs),
      goods_desc: form.goods_desc.trim(),
      hs_code: form.hs_code || undefined,
      quantity_code: form.quantity_code,
      declared_currency: form.declared_currency,
      declared_value: toNumber(form.declared_value),
    };

    saveBox.mutate({ boxId, payload }, { onSuccess: onClose });
  }

  /** A server-side message for this field, if the API flagged one. */
  const fieldError = (name: string): string | undefined =>
    errors[name] ??
    (isApiError(saveBox.error) ? saveBox.error.fieldError(name) : undefined);

  const loadingRecord = isEdit && box.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit box" : "Add box"}</DialogTitle>
        </DialogHeader>

        {loadingRecord ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading box…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldShell label="Box no.">
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    min="1"
                    value={form.box_no}
                    onChange={(event) => set("box_no", event.target.value)}
                  />
                )}
              </FieldShell>

              <FieldShell label="Weight (kg)" required error={fieldError("weight")}>
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.weight}
                    onChange={(event) => set("weight", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={fieldError("weight") ? true : undefined}
                  />
                )}
              </FieldShell>

              <FieldShell label="Volumetric weight" hint="Optional">
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.volumetric_weight}
                    onChange={(event) =>
                      set("volumetric_weight", event.target.value)
                    }
                    aria-describedby={describedBy}
                  />
                )}
              </FieldShell>

              <FieldShell
                label="No. of pieces"
                required
                error={fieldError("no_of_pcs")}
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    min="1"
                    value={form.no_of_pcs}
                    onChange={(event) => set("no_of_pcs", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={fieldError("no_of_pcs") ? true : undefined}
                  />
                )}
              </FieldShell>

              <FieldShell label="Length (cm)">
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.length}
                    onChange={(event) => set("length", event.target.value)}
                  />
                )}
              </FieldShell>

              <FieldShell label="Width (cm)">
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.width}
                    onChange={(event) => set("width", event.target.value)}
                  />
                )}
              </FieldShell>

              <FieldShell label="Height (cm)">
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.height}
                    onChange={(event) => set("height", event.target.value)}
                  />
                )}
              </FieldShell>

              <FieldShell
                label="Quantity code"
                required
                error={fieldError("quantity_code")}
              >
                {() => (
                  <Combobox
                    options={quantityCodeOptions}
                    value={form.quantity_code}
                    onChange={(value) => set("quantity_code", value)}
                    placeholder="Select or type a code"
                    searchPlaceholder="Search codes…"
                    allowCustomValue
                    aria-invalid={Boolean(fieldError("quantity_code"))}
                  />
                )}
              </FieldShell>

              <FieldShell label="HS code" hint="Optional">
                {() => (
                  <AsyncCombobox
                    value={form.hs_code}
                    selectedLabel={form.hs_code_label}
                    onChange={(option) =>
                      setForm((current) => ({
                        ...current,
                        hs_code: option.value,
                        hs_code_label: option.label,
                      }))
                    }
                    fetchPage={hsCodeFetcher}
                    placeholder="Select or type an HS code"
                    searchPlaceholder="Search HS codes…"
                    allowCustomValue
                  />
                )}
              </FieldShell>

              <FieldShell
                label="Declared currency"
                required
                error={fieldError("declared_currency")}
              >
                {() => (
                  <AsyncCombobox
                    value={form.declared_currency}
                    selectedLabel={form.declared_currency_label}
                    onChange={(option) =>
                      setForm((current) => ({
                        ...current,
                        declared_currency: option.value,
                        declared_currency_label: option.label,
                      }))
                    }
                    fetchPage={currencyFetcher}
                    placeholder="Select currency"
                    searchPlaceholder="Search currencies…"
                    allowCustomValue
                    aria-invalid={Boolean(fieldError("declared_currency"))}
                  />
                )}
              </FieldShell>

              <FieldShell
                label="Declared value"
                required
                error={fieldError("declared_value")}
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.declared_value}
                    onChange={(event) => set("declared_value", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={fieldError("declared_value") ? true : undefined}
                  />
                )}
              </FieldShell>

              <FieldShell
                label="Goods description"
                required
                error={fieldError("goods_desc")}
                className="sm:col-span-2"
              >
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    placeholder="Mobile phones"
                    value={form.goods_desc}
                    onChange={(event) => set("goods_desc", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={fieldError("goods_desc") ? true : undefined}
                  />
                )}
              </FieldShell>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saveBox.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveBox.isPending}>
                {saveBox.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isEdit ? "Save changes" : "Add box"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
