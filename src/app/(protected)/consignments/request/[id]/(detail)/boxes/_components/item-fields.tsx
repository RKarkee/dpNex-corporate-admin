"use client";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { useLookupLabel } from "@/shared/hooks/use-lookup-label";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { DEFAULT_CURRENCY, DEFAULT_QUANTITY_CODE } from "../../../../schema";
import type { ItemWritePayload } from "../../../../types";
import { FieldShell } from "../../../../_components/field-shell";
import {
  currencyFetcher,
  hsCodeFetcher,
  manufacturerFetcher,
  materialFetcher,
} from "../../../../_components/lookup-fetchers";

/**
 * One item's fields, state shape, validation and payload mapping — in one place.
 *
 * Two callers need exactly this set and must not drift apart:
 *
 * - `ItemFormDialog`, editing or adding an item on a box that already exists.
 *   It saves through the item endpoints, one request per item.
 * - `BoxFormDialog`, composing items for a box that does *not* exist yet. Those
 *   items cannot be posted individually — there is no box id to post them
 *   against — so they ride nested inside the box's own create request.
 *
 * Extracting this was the point: the second caller is new, and duplicating
 * eleven fields plus their validation would guarantee the two sets diverge the
 * first time a field is added.
 *
 * Every field is held as a string — that is what an `<input>` gives back, and
 * keeping numbers as strings until submit is what lets a field be genuinely
 * empty rather than `0`.
 */

export interface ItemFormState {
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

export const EMPTY_ITEM_FORM: ItemFormState = {
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

/** `""` stays `undefined`, so an untouched field is omitted rather than zeroed. */
export function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * True when the user has typed nothing into this row.
 *
 * The box dialog opens with one item row already showing, so the fields are
 * there to fill rather than hidden behind a button. That convenience must not
 * turn into a requirement: an untouched row is dropped before validation and
 * before the payload is built, so a box with no items still saves.
 *
 * Only the user-enterable fields count. `item_quantity_code` and
 * `item_currency` carry defaults and are non-empty from the start, so including
 * them would make every row look touched.
 */
export function isPristineItem(form: ItemFormState): boolean {
  return ITEM_ENTRY_FIELDS.every((field) => !form[field].trim());
}

/**
 * The fields a user actually types into.
 *
 * A declared list rather than a chain of `&&`, so adding a field to
 * `ItemFormState` and forgetting it here is a one-line fix in an obvious place
 * — and `satisfies` makes a typo in a name a compile error rather than a row
 * that silently always looks blank.
 */
const ITEM_ENTRY_FIELDS = [
  "item_name",
  "item_hs_code",
  "item_material",
  "item_manufacturer",
  "item_gender",
  "quantity",
  "item_rate",
  "item_total_amount",
] as const satisfies readonly (keyof ItemFormState)[];

/** Field name → message, empty when the item is valid. */
export function validateItemForm(
  form: ItemFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.item_name.trim()) errors.item_name = "Item name is required";

  const quantity = toNumber(form.quantity);
  if (quantity === undefined || quantity <= 0) {
    errors.quantity = "Quantity must be at least 1";
  }
  if (!form.item_quantity_code) {
    errors.item_quantity_code = "Quantity code is required";
  }

  const rate = toNumber(form.item_rate);
  if (rate === undefined || rate < 0) errors.item_rate = "Rate is required";

  const total = toNumber(form.item_total_amount);
  if (total === undefined || total < 0) {
    errors.item_total_amount = "Total amount is required";
  }

  if (!form.item_currency) errors.item_currency = "Currency is required";

  return errors;
}

/**
 * Form state → wire payload.
 *
 * One rename to watch: the API *returns* `item_quantity` and *accepts*
 * `quantity`. They are the same number.
 */
export function toItemPayload(form: ItemFormState): ItemWritePayload {
  return {
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
}

export interface ItemFieldsProps {
  value: ItemFormState;
  onChange: (patch: Partial<ItemFormState>) => void;
  /** Field name → message. Server-side and client-side both land here. */
  errors?: Record<string, string | undefined>;
  disabled?: boolean;
}

export function ItemFields({
  value,
  onChange,
  errors = {},
  disabled = false,
}: ItemFieldsProps) {
  const { quantityCodeOptions, genderOptions } = useMetaOptions();

  /**
   * Names for the four codes the record stores.
   *
   * The form's own `*_label` wins when it is set, because that only happens when
   * the user picked an option and the label came back with it. Otherwise these
   * fill in what the detail response could not — it returns codes only.
   *
   * These are hooks, so a list of items renders one `ItemFields` per row rather
   * than looping inside a single component.
   */
  const resolvedHsCode = useLookupLabel("hsCode", value.item_hs_code);
  const resolvedMaterial = useLookupLabel("material", value.item_material);
  const resolvedManufacturer = useLookupLabel(
    "manufacturer",
    value.item_manufacturer,
  );
  const resolvedCurrency = useLookupLabel("currency", value.item_currency);

  const error = (name: string) => errors[name];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FieldShell
        label="Item name"
        required
        error={error("item_name")}
        className="sm:col-span-2"
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="iPhone 14 case"
            value={value.item_name}
            disabled={disabled}
            onChange={(event) => onChange({ item_name: event.target.value })}
            aria-describedby={describedBy}
            aria-invalid={error("item_name") ? true : undefined}
          />
        )}
      </FieldShell>

      <FieldShell label="HS code" hint="Optional">
        {() => (
          <AsyncCombobox
            value={value.item_hs_code}
            selectedLabel={value.item_hs_code_label || resolvedHsCode}
            onChange={(option) =>
              onChange({
                item_hs_code: option.value,
                item_hs_code_label: option.label,
              })
            }
            fetchPage={hsCodeFetcher}
            placeholder="Select or type an HS code"
            searchPlaceholder="Search HS codes…"
            allowCustomValue
            disabled={disabled}
          />
        )}
      </FieldShell>

      <FieldShell label="Material" hint="Optional">
        {() => (
          <AsyncCombobox
            value={value.item_material}
            selectedLabel={value.item_material_label || resolvedMaterial}
            onChange={(option) =>
              onChange({
                item_material: option.value,
                item_material_label: option.label,
              })
            }
            fetchPage={materialFetcher}
            placeholder="Select or type a material"
            searchPlaceholder="Search materials…"
            allowCustomValue
            disabled={disabled}
          />
        )}
      </FieldShell>

      <FieldShell label="Manufacturer" hint="Optional">
        {() => (
          <AsyncCombobox
            value={value.item_manufacturer}
            selectedLabel={
              value.item_manufacturer_label || resolvedManufacturer
            }
            onChange={(option) =>
              onChange({
                item_manufacturer: option.value,
                item_manufacturer_label: option.label,
              })
            }
            fetchPage={manufacturerFetcher}
            placeholder="Select or type a manufacturer"
            searchPlaceholder="Search manufacturers…"
            allowCustomValue
            disabled={disabled}
          />
        )}
      </FieldShell>

      <FieldShell label="Gender" hint="For apparel and footwear">
        {() => (
          <Combobox
            options={genderOptions}
            value={value.item_gender}
            onChange={(next) => onChange({ item_gender: next })}
            placeholder="Select gender"
            searchPlaceholder="Search…"
            allowCustomValue={false}
            disabled={disabled}
          />
        )}
      </FieldShell>

      <FieldShell label="Quantity" required error={error("quantity")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            min="1"
            value={value.quantity}
            disabled={disabled}
            onChange={(event) => onChange({ quantity: event.target.value })}
            aria-describedby={describedBy}
            aria-invalid={error("quantity") ? true : undefined}
          />
        )}
      </FieldShell>

      <FieldShell
        label="Quantity code"
        required
        error={error("item_quantity_code")}
      >
        {() => (
          <Combobox
            options={quantityCodeOptions}
            value={value.item_quantity_code}
            onChange={(next) => onChange({ item_quantity_code: next })}
            placeholder="Select or type a code"
            searchPlaceholder="Search codes…"
            allowCustomValue
            disabled={disabled}
            aria-invalid={Boolean(error("item_quantity_code"))}
          />
        )}
      </FieldShell>

      <FieldShell label="Rate" required error={error("item_rate")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            step="0.01"
            min="0"
            value={value.item_rate}
            disabled={disabled}
            onChange={(event) => onChange({ item_rate: event.target.value })}
            aria-describedby={describedBy}
            aria-invalid={error("item_rate") ? true : undefined}
          />
        )}
      </FieldShell>

      <FieldShell
        label="Total amount"
        required
        error={error("item_total_amount")}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="number"
            step="0.01"
            min="0"
            value={value.item_total_amount}
            disabled={disabled}
            onChange={(event) =>
              onChange({ item_total_amount: event.target.value })
            }
            aria-describedby={describedBy}
            aria-invalid={error("item_total_amount") ? true : undefined}
          />
        )}
      </FieldShell>

      <FieldShell label="Currency" required error={error("item_currency")}>
        {() => (
          <AsyncCombobox
            value={value.item_currency}
            selectedLabel={value.item_currency_label || resolvedCurrency}
            onChange={(option) =>
              onChange({
                item_currency: option.value,
                item_currency_label: option.label,
              })
            }
            fetchPage={currencyFetcher}
            placeholder="Select currency"
            searchPlaceholder="Search currencies…"
            allowCustomValue
            disabled={disabled}
            aria-invalid={Boolean(error("item_currency"))}
          />
        )}
      </FieldShell>
    </div>
  );
}
