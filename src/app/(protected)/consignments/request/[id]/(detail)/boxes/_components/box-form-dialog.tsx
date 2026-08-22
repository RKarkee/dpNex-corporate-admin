"use client";

import * as React from "react";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";

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
import { useLookupLabel } from "@/shared/hooks/use-lookup-label";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { useConsignmentBox, useSaveBox } from "../_hooks/use-consignment-boxes";
import { DEFAULT_CURRENCY, DEFAULT_QUANTITY_CODE } from "../../../../schema";
import type { BoxWritePayload } from "../../../../types";
import { FieldShell } from "../../../../_components/field-shell";
import { currencyFetcher, hsCodeFetcher } from "../../../../_components/lookup-fetchers";
import {
  EMPTY_ITEM_FORM,
  isPristineItem,
  ItemFields,
  toItemPayload,
  validateItemForm,
  type ItemFormState,
} from "./item-fields";

/**
 * Add or edit one box on an existing request.
 *
 * Plain `useState` rather than react-hook-form: flat fields with no cross-field
 * rules, in a dialog that unmounts between uses. The big form earns its
 * resolver; this does not.
 *
 * Every field is held as a string — that is what an `<input>` gives back, and
 * keeping numbers as strings until submit is what lets a field be genuinely
 * empty rather than `0`.
 *
 * **Items, on create only.** `POST …/boxes` accepts items nested inside each
 * box, so a new box and its contents are created in one request — either both
 * land or neither does, and the user is not left with an empty box to fill in
 * afterwards.
 *
 * Editing deliberately does not offer them. On an existing box the items are
 * already separate records with their own ids and their own working endpoints;
 * sending them nested on a PATCH would be asking the API to reconcile a list,
 * and whether it replaces, appends or merges is unverified — a wrong guess
 * silently duplicates or destroys rows. Items on an existing box are managed
 * from its row in the table instead.
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

/** One item being composed alongside a new box. */
interface StagedItem {
  localId: string;
  form: ItemFormState;
  errors: Record<string, string>;
}

let itemSequence = 0;

function newStagedItem(): StagedItem {
  itemSequence += 1;
  return {
    localId: `staged-item-${itemSequence}`,
    form: EMPTY_ITEM_FORM,
    errors: {},
  };
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

  /**
   * Items staged for a box that does not exist yet.
   *
   * `localId` rather than array index as the React key: removing a middle row
   * would otherwise shift every key below it, and React would re-use the wrong
   * inputs — the classic symptom being a deleted row's values reappearing in
   * its neighbour.
   */
  const [items, setItems] = React.useState<StagedItem[]>([]);

  /**
   * Names for the two codes the record stores.
   *
   * The form's own `*_label` wins when it is set, because that only happens
   * when the user picked an option and the label came back with it. Otherwise
   * these fill in what the detail response could not.
   */
  const resolvedHsCode = useLookupLabel("hsCode", form.hs_code);
  const resolvedCurrency = useLookupLabel("currency", form.declared_currency);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  /**
   * Seed once per record. The dialog is mounted before its box arrives, and
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
      // One row open from the start: adding a box almost always means adding
      // what is in it, and hiding the fields behind a button makes that look
      // like a separate step. An untouched row is dropped on submit, so this
      // costs nothing when the box really is empty.
      setItems([newStagedItem()]);
      setForm({
        ...EMPTY_FORM,
        box_no: nextBoxNo ? String(nextBoxNo) : "",
      });
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
      // Left blank on purpose: `useLookupLabel` below turns the stored code
      // into its name. Seeding it with the code would win over the resolved
      // label and pin the trigger to `8517.12` forever.
      hs_code_label: "",
      quantity_code: text(record.quantity_code) || DEFAULT_QUANTITY_CODE,
      declared_currency: text(record.declared_currency) || DEFAULT_CURRENCY,
      declared_currency_label: "",
      declared_value: text(record.declared_value),
    });
  }, [open, isEdit, boxId, box.data, nextBoxNo]);

  const addItem = () => setItems((current) => [...current, newStagedItem()]);

  const removeItem = (localId: string) =>
    setItems((current) => current.filter((row) => row.localId !== localId));

  const patchItem = (localId: string, next: Partial<ItemFormState>) =>
    setItems((current) =>
      current.map((row) =>
        row.localId === localId
          ? {
              ...row,
              form: { ...row.form, ...next },
              // Editing a field answers whatever the last submit said about it.
              errors: Object.fromEntries(
                Object.entries(row.errors).filter(
                  ([field]) => !(field in next),
                ),
              ),
            }
          : row,
      ),
    );

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

  /**
   * Validates every *touched* item and writes each one's messages back to its
   * own row, so all the bad rows light up at once rather than one per attempt.
   *
   * Untouched rows are skipped and their errors cleared — the dialog opens with
   * one row showing, and a user who does not want items should not have to
   * delete it to save.
   */
  function validateItems(): boolean {
    let ok = true;

    setItems((current) =>
      current.map((row) => {
        if (isPristineItem(row.form)) return { ...row, errors: {} };

        const problems = validateItemForm(row.form);
        if (Object.keys(problems).length) ok = false;
        return { ...row, errors: problems };
      }),
    );

    return ok;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Both run: `&&` would short-circuit and leave the items unmarked when the
    // box itself is also invalid, hiding half the work still to do.
    const boxOk = validate();
    const itemsOk = isEdit ? true : validateItems();
    if (!boxOk || !itemsOk) return;

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
      // Nested only on create, and omitted entirely when nothing was filled in
      // — an empty array would ask the API to reconcile a list it need not
      // touch, and the row the dialog opens with is usually still blank.
      ...(!isEdit && filledItems.length
        ? { items: filledItems.map((row) => toItemPayload(row.form)) }
        : {}),
    };

    saveBox.mutate({ boxId, payload }, { onSuccess: onClose });
  }

  /**
   * The rows that will actually be sent — what the submit button counts, so it
   * never promises to create an item the user only saw an empty form for.
   */
  const filledItems = items.filter((row) => !isPristineItem(row.form));

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
                    selectedLabel={form.hs_code_label || resolvedHsCode}
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
                    selectedLabel={form.declared_currency_label || resolvedCurrency}
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

            {/* Create only — see the note at the top of this file for why an
                existing box manages its items from the table instead. */}
            {isEdit ? null : (
              <section className="space-y-4 border-t border-border pt-5">
                {/* Deliberately not `flex-wrap`: the description is long
                    enough to fill the row on its own, and a wrapping button
                    drops to the next line where `justify-between` no longer
                    applies — landing it on the left. `min-w-0` lets the text
                    shrink instead, `shrink-0` keeps the button its natural
                    size, and the two stay on one line. */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Package className="size-4 text-primary" aria-hidden />
                      Items in this box
                      {filledItems.length ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          {filledItems.length}
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Optional — leave blank to add an empty box.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    disabled={saveBox.isPending}
                    className="shrink-0"
                  >
                    <Plus className="size-4" aria-hidden />
                    Add item
                  </Button>
                </div>

                {items.map((row, index) => (
                  <div
                    key={row.localId}
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-2.5">
                      <span className="text-sm font-medium text-foreground">
                        Item {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(row.localId)}
                        disabled={saveBox.isPending}
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        <span className="sr-only">Remove item {index + 1}</span>
                      </Button>
                    </div>

                    <div className="p-4">
                      <ItemFields
                        value={row.form}
                        onChange={(next) => patchItem(row.localId, next)}
                        errors={row.errors}
                        disabled={saveBox.isPending}
                      />
                    </div>
                  </div>
                ))}
              </section>
            )}

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
                {isEdit
                  ? "Save changes"
                  : filledItems.length
                    ? `Add box with ${filledItems.length} item${filledItems.length > 1 ? "s" : ""}`
                    : "Add box"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
