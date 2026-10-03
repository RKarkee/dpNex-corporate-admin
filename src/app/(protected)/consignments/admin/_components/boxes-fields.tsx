"use client";

import * as React from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { Boxes, Package, Plus, Trash2, TriangleAlert } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Combobox, type ComboboxOption } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { WeightDimensionBanner } from "@/shared/components/ui/weight-dimension-banner";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";
import { blockSignInputProps, nonNegativeInputProps } from "@/shared/lib/number-input";
import { cn } from "@/shared/lib/utils";

import { useCheckWeightDimension } from "../_hooks/use-check-weight-dimension";
import type { QuotedBox, ShipmentRouting, WeightDimensionCheckResult } from "../types";

import { newBoxDefaults, newItemDefaults } from "../schema";
import { FieldGroup, FieldShell } from "./field-shell";
import type {
  AdminControl,
  AdminErrors,
  AdminRegister,
  AdminSetValue,
} from "./form-types";
import {
  currencyFetcher,
  hsCodeFetcher,
  manufacturerFetcher,
  materialFetcher,
} from "./lookup-fetchers";

/** Fields the weight check fills in: read-only and greyed, never disabled. */
const LOCKED_FIELD_CLASS = "bg-muted cursor-not-allowed focus-visible:ring-0";
/**
 * Weight-check highlights are amber, not red: "the system changed this, please
 * look", not "this is invalid". Validation errors stay red.
 */
const CHECK_HIGHLIGHT_CLASS = "border-amber-500 focus-visible:ring-amber-200";
const CHECK_HINT_CLASS = "mt-1 text-xs text-amber-600";

/** The receiver's address as the weight check needs it. */
type ReceiverAddress = {
  country?: string | null;
  state?: string | null;
  city?: string | null;
  zip?: string | null;
};

/** Blank or non-numeric → undefined; a coerced form field holds strings. */
function toNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The box tree: boxes, and the items inside each of them.
 *
 * Two nested `useFieldArray`s — one for boxes, one per box for its items. The
 * meta options are fetched once at the top and threaded down as props rather
 * than re-hooked per row: a ten-box consignment would otherwise mount dozens of
 * subscribers to the same cache entry for no benefit.
 */

/** Which fields the latest check response changed — drives the amber highlight. */
type WeightCheckFlags = { volumetric?: boolean; quantityCode?: boolean };

/** The check result already folded into this box, and what it produced. */
interface AppliedWeightCheck {
  result: WeightDimensionCheckResult | null;
  /** Display only — never submitted. */
  validWeight: string;
  flags: WeightCheckFlags;
}

const EMPTY_APPLIED: AppliedWeightCheck = { result: null, validWeight: "", flags: {} };

/** The values a check response fills in; `undefined` = not in the response. */
function mapWeightCheck(result: WeightDimensionCheckResult) {
  const w = result.weights;
  // `quantity_code` is the current key; older responses called it `unit`.
  const code = w?.quantity_code ?? w?.unit;
  return {
    volumetric:
      w?.volumetric_weight != null && w.volumetric_weight !== ""
        ? Number(w.volumetric_weight)
        : undefined,
    quantityCode: code ? String(code).trim().toUpperCase() : undefined,
    validWeight:
      w?.valid_weight != null && w.valid_weight !== "" ? String(w.valid_weight) : undefined,
  };
}

export interface BoxesFieldsProps {
  control: AdminControl;
  register: AdminRegister;
  setValue: AdminSetValue;
  errors: AdminErrors;
  /** From the quote (create) or the record (edit) — for the weight check. */
  routing: ShipmentRouting;
  /** The receiver's current address — for the weight check. */
  receiver: ReceiverAddress;
  /**
   * Create only: the boxes the chosen quote was priced on. Their weight check
   * runs on mount, and a warning shows once the boxes stop matching.
   */
  quotedBoxes?: QuotedBox[];
}

const QUOTED_MEASURES = ["weight", "length", "width", "height"] as const;

/**
 * Shown when the boxes no longer match the ones the quote was priced on — a
 * different count, or any weight / length / width / height changed. Warns
 * only: small corrections at this step are normal.
 */
function QuotedBoxesNotice({
  control,
  quotedBoxes,
}: {
  control: AdminControl;
  quotedBoxes: QuotedBox[];
}) {
  const boxes = useWatch({ control, name: "boxes" }) ?? [];
  const changed =
    boxes.length !== quotedBoxes.length ||
    boxes.some((box, index) =>
      QUOTED_MEASURES.some(
        (key) => Number(box?.[key]) !== Number(quotedBoxes[index]?.[key]),
      ),
    );
  if (!changed) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        Boxes changed since rates were checked — the selected rate may no longer
        apply. Check rates again if the change is significant.
      </span>
    </div>
  );
}

export function BoxesFields({
  control,
  register,
  setValue,
  errors,
  routing,
  receiver,
  quotedBoxes,
}: BoxesFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "boxes" });
  const { quantityCodeOptions, genderOptions } = useMetaOptions();

  return (
    <Card className="p-6 sm:p-8">
      <FieldGroup
        title="Boxes"
        description="Each physical box, and what is inside it."
        icon={Boxes}
        className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ ...newBoxDefaults, box_no: fields.length + 1 })
            }
          >
            <Plus className="size-4" />
            Add box
          </Button>
        }
      >
        {/* The array-level message — "add at least one box" — has no field to
            sit under, so it goes here. */}
        {errors.boxes?.root ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.boxes.root.message}
          </p>
        ) : null}

        {quotedBoxes ? (
          <QuotedBoxesNotice control={control} quotedBoxes={quotedBoxes} />
        ) : null}

        {fields.map((field, index) => (
          <BoxRow
            key={field.id}
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            index={index}
            quantityCodeOptions={quantityCodeOptions}
            genderOptions={genderOptions}
            routing={routing}
            receiver={receiver}
            onRemove={() => remove(index)}
            // The schema requires one, so the last box cannot be removed.
            canRemove={fields.length > 1}
            // Boxes carried from the quote are checked straight away; on edit
            // (no quote) a check still waits for the user's first change.
            autoCheckOnMount={Boolean(quotedBoxes)}
          />
        ))}
      </FieldGroup>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* One box                                                                    */
/* -------------------------------------------------------------------------- */

interface BoxRowProps {
  control: AdminControl;
  register: AdminRegister;
  setValue: AdminSetValue;
  errors: AdminErrors;
  index: number;
  quantityCodeOptions: ComboboxOption[];
  genderOptions: ComboboxOption[];
  onRemove: () => void;
  canRemove: boolean;
  routing: ShipmentRouting;
  receiver: ReceiverAddress;
  /** Read once, at mount — arms the weight check without a user edit. */
  autoCheckOnMount?: boolean;
}

function BoxRow({
  control,
  register,
  setValue,
  errors,
  index,
  quantityCodeOptions,
  genderOptions,
  onRemove,
  canRemove,
  routing,
  receiver,
  autoCheckOnMount = false,
}: BoxRowProps) {
  const boxErrors = errors.boxes?.[index];

  // Subscribed individually so a keystroke in one box does not re-render the
  // whole array.
  const hsCodeLabel = useWatch({ control, name: `boxes.${index}.hs_code_label` });
  const currencyLabel = useWatch({
    control,
    name: `boxes.${index}.declared_currency_label`,
  });

  // Weight / dimension check. Fires after the user edits this box's weight,
  // length, width or height — never when a record is loaded for edit. Boxes
  // carried over from the rate check (`autoCheckOnMount`) are armed from the
  // start, so their volumetric weight and any flags show without a keystroke;
  // re-checks still follow only this box's own measures.
  const boxNo = useWatch({ control, name: `boxes.${index}.box_no` });
  const weight = useWatch({ control, name: `boxes.${index}.weight` });
  const length = useWatch({ control, name: `boxes.${index}.length` });
  const width = useWatch({ control, name: `boxes.${index}.width` });
  const height = useWatch({ control, name: `boxes.${index}.height` });
  const volumetric = useWatch({ control, name: `boxes.${index}.volumetric_weight` });
  const quantityCode = useWatch({ control, name: `boxes.${index}.quantity_code` });

  const [dimensionsTouched, setDimensionsTouched] = React.useState(autoCheckOnMount);
  const [applied, setApplied] = React.useState<AppliedWeightCheck>(EMPTY_APPLIED);
  const { validWeight, flags } = applied;
  const setFlags = (update: (current: WeightCheckFlags) => WeightCheckFlags) =>
    setApplied((current) => ({ ...current, flags: update(current.flags) }));

  const weightCheck = useCheckWeightDimension({
    boxNo: Number(boxNo) || index + 1,
    routing,
    receiver,
    weight,
    length,
    width,
    height,
    enabled: dimensionsTouched,
  });

  // A new result is folded into local state during render (React's "adjust
  // state when a value changes" pattern), compared against the values it is
  // about to replace — so the highlight marks only what actually changed.
  const latest = weightCheck.status === "success" ? weightCheck.result : null;
  if (latest && latest !== applied.result) {
    const mapped = mapWeightCheck(latest);
    setApplied({
      result: latest,
      validWeight: mapped.validWeight ?? applied.validWeight,
      flags: {
        volumetric:
          mapped.volumetric !== undefined &&
          (volumetric === "" || volumetric == null || Number(volumetric) !== mapped.volumetric),
        quantityCode:
          mapped.quantityCode !== undefined &&
          String(quantityCode ?? "").trim().toUpperCase() !== mapped.quantityCode,
      },
    });
  }

  // Writing into react-hook-form is a side effect, so it stays in an effect —
  // once per applied result, never on the re-render its own setValue causes.
  // Keyed on the result only: a row's index shifting after a removal must not
  // re-apply an old result over a Quantity Code the user has since edited.
  React.useEffect(() => {
    if (!applied.result) return;
    const mapped = mapWeightCheck(applied.result);
    if (mapped.volumetric !== undefined) {
      setValue(`boxes.${index}.volumetric_weight`, mapped.volumetric, { shouldDirty: true });
    }
    if (mapped.quantityCode !== undefined) {
      setValue(`boxes.${index}.quantity_code`, mapped.quantityCode, { shouldDirty: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied.result]);

  // Actual weight is what the user typed; Valid Weight is what the system
  // accepts. Both are highlighted while they disagree.
  const weightMismatch =
    validWeight !== "" &&
    weight !== "" &&
    weight != null &&
    !Number.isNaN(Number(weight)) &&
    Number(weight) !== Number(validWeight);

  /** Marks that the user changed a dimension — what arms the check. */
  const touchDimension = { onChange: () => setDimensionsTouched(true) };

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/60 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">
          Box {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove box ${index + 1}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid gap-5 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <FieldShell label="Box no." required>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min="1"
              {...blockSignInputProps}
              {...register(`boxes.${index}.box_no`)}
            />
          )}
        </FieldShell>

        <FieldShell label="Weight (kg)" required error={boxErrors?.weight?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              step="any"
              {...nonNegativeInputProps}
              aria-describedby={describedBy}
              aria-invalid={boxErrors?.weight ? true : undefined}
              className={weightMismatch ? CHECK_HIGHLIGHT_CLASS : undefined}
              {...register(`boxes.${index}.weight`, touchDimension)}
            />
          )}
        </FieldShell>

        <FieldShell label="Length (cm)">
          {({ id }) => (
            <Input
              id={id}
              type="number"
              step="any"
              {...nonNegativeInputProps}
              {...register(`boxes.${index}.length`, touchDimension)}
            />
          )}
        </FieldShell>

        <FieldShell label="Width (cm)">
          {({ id }) => (
            <Input
              id={id}
              type="number"
              step="any"
              {...nonNegativeInputProps}
              {...register(`boxes.${index}.width`, touchDimension)}
            />
          )}
        </FieldShell>

        <FieldShell label="Height (cm)">
          {({ id }) => (
            <Input
              id={id}
              type="number"
              step="any"
              {...nonNegativeInputProps}
              {...register(`boxes.${index}.height`, touchDimension)}
            />
          )}
        </FieldShell>

        {/* Locked: filled by the weight check. readOnly, NOT disabled — a
            disabled react-hook-form input submits as undefined. */}
        <FieldShell label="Volumetric weight" hint="Auto-filled by weight check">
          {({ id, describedBy }) => (
            <>
              <Input
                id={id}
                type="number"
                step="any"
                readOnly
                tabIndex={-1}
                aria-describedby={describedBy}
                className={cn(LOCKED_FIELD_CLASS, flags.volumetric && CHECK_HIGHLIGHT_CLASS)}
                {...register(`boxes.${index}.volumetric_weight`)}
              />
              {flags.volumetric ? (
                <p className={CHECK_HINT_CLASS}>Updated from weight check — please review</p>
              ) : null}
            </>
          )}
        </FieldShell>

        <FieldShell label="Valid weight" hint="Accepted weight — not sent on save">
          {({ id, describedBy }) => (
            <>
              <Input
                id={id}
                type="number"
                step="any"
                readOnly
                tabIndex={-1}
                placeholder="Auto-filled by weight check"
                aria-describedby={describedBy}
                value={validWeight}
                className={cn(LOCKED_FIELD_CLASS, weightMismatch && CHECK_HIGHLIGHT_CLASS)}
              />
              {weightMismatch ? (
                <p className={CHECK_HINT_CLASS}>
                  Differs from entered weight ({String(weight)})
                </p>
              ) : null}
            </>
          )}
        </FieldShell>

        <FieldShell
          label="No. of pieces"
          required
          error={boxErrors?.no_of_pcs?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              min="1"
              {...blockSignInputProps}
              aria-describedby={describedBy}
              aria-invalid={boxErrors?.no_of_pcs ? true : undefined}
              {...register(`boxes.${index}.no_of_pcs`)}
            />
          )}
        </FieldShell>

        <FieldShell label="Quantity code" required>
          {() => (
            <>
              <Controller
                control={control}
                name={`boxes.${index}.quantity_code`}
                render={({ field }) => (
                  <Combobox
                    options={quantityCodeOptions}
                    value={field.value ?? ""}
                    onChange={(value) => {
                      setFlags((f) => ({ ...f, quantityCode: false }));
                      field.onChange(value);
                    }}
                    placeholder="Select or type a code"
                    searchPlaceholder="Search codes…"
                    allowCustomValue
                    className={flags.quantityCode ? CHECK_HIGHLIGHT_CLASS : undefined}
                  />
                )}
              />
              {flags.quantityCode ? (
                <p className={CHECK_HINT_CLASS}>Updated from weight check — please review</p>
              ) : null}
            </>
          )}
        </FieldShell>

        <FieldShell label="HS code" hint="Optional">
          {() => (
            <Controller
              control={control}
              name={`boxes.${index}.hs_code`}
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value ?? ""}
                  selectedLabel={hsCodeLabel}
                  onChange={(option) => {
                    field.onChange(option.value);
                    setValue(`boxes.${index}.hs_code_label`, option.label);
                  }}
                  fetchPage={hsCodeFetcher}
                  placeholder="Select or type an HS code"
                  searchPlaceholder="Search HS codes…"
                  allowCustomValue
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Declared currency"
          required
          error={boxErrors?.declared_currency?.message}
        >
          {() => (
            <Controller
              control={control}
              name={`boxes.${index}.declared_currency`}
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value ?? ""}
                  selectedLabel={currencyLabel}
                  onChange={(option) => {
                    field.onChange(option.value);
                    setValue(
                      `boxes.${index}.declared_currency_label`,
                      option.label,
                    );
                  }}
                  fetchPage={currencyFetcher}
                  placeholder="Select currency"
                  searchPlaceholder="Search currencies…"
                  allowCustomValue
                  aria-invalid={Boolean(boxErrors?.declared_currency)}
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Declared value"
          required
          error={boxErrors?.declared_value?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              step="0.01"
              {...nonNegativeInputProps}
              aria-describedby={describedBy}
              aria-invalid={boxErrors?.declared_value ? true : undefined}
              {...register(`boxes.${index}.declared_value`)}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Goods description"
          required
          error={boxErrors?.goods_desc?.message}
          className="sm:col-span-2 lg:col-span-3"
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="Mobile phones"
              aria-describedby={describedBy}
              aria-invalid={boxErrors?.goods_desc ? true : undefined}
              {...register(`boxes.${index}.goods_desc`)}
            />
          )}
        </FieldShell>
      </div>

      <WeightDimensionBanner
        status={weightCheck.status}
        result={
          weightCheck.result
            ? {
                divisor: weightCheck.result.weights?.divisor,
                oversize_exception: weightCheck.result.oversize_exception,
                overweight_exception: weightCheck.result.overweight_exception,
                exception_types: weightCheck.result.exception_types,
              }
            : null
        }
        errorMessage={weightCheck.errorMessage}
        className="mx-4 mb-4"
      />

      <BoxItemsFields
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        boxIndex={index}
        quantityCodeOptions={quantityCodeOptions}
        genderOptions={genderOptions}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The items inside one box                                                   */
/* -------------------------------------------------------------------------- */

interface BoxItemsFieldsProps {
  control: AdminControl;
  register: AdminRegister;
  setValue: AdminSetValue;
  errors: AdminErrors;
  boxIndex: number;
  quantityCodeOptions: ComboboxOption[];
  genderOptions: ComboboxOption[];
}

function BoxItemsFields({
  control,
  register,
  setValue,
  errors,
  boxIndex,
  quantityCodeOptions,
  genderOptions,
}: BoxItemsFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `boxes.${boxIndex}.items`,
  });

  const itemsError = errors.boxes?.[boxIndex]?.items?.root;

  return (
    <div className="space-y-3 border-t border-border bg-secondary/30 px-4 pb-4 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Package className="size-3.5" />
          Items
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ ...newItemDefaults })}
        >
          <Plus className="size-3.5" />
          Add item
        </Button>
      </div>

      {itemsError ? (
        <p role="alert" className="text-xs text-destructive">
          {itemsError.message}
        </p>
      ) : null}

      {fields.map((field, itemIndex) => (
        <BoxItemRow
          key={field.id}
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          boxIndex={boxIndex}
          itemIndex={itemIndex}
          quantityCodeOptions={quantityCodeOptions}
          genderOptions={genderOptions}
          onRemove={() => remove(itemIndex)}
          canRemove={fields.length > 1}
        />
      ))}
    </div>
  );
}

interface BoxItemRowProps extends BoxItemsFieldsProps {
  itemIndex: number;
  onRemove: () => void;
  canRemove: boolean;
}

function BoxItemRow({
  control,
  register,
  setValue,
  errors,
  boxIndex,
  itemIndex,
  quantityCodeOptions,
  genderOptions,
  onRemove,
  canRemove,
}: BoxItemRowProps) {
  const base = `boxes.${boxIndex}.items.${itemIndex}` as const;
  const itemErrors = errors.boxes?.[boxIndex]?.items?.[itemIndex];

  const hsCodeLabel = useWatch({ control, name: `${base}.item_hs_code_label` });
  const materialLabel = useWatch({ control, name: `${base}.item_material_label` });
  const manufacturerLabel = useWatch({
    control,
    name: `${base}.item_manufacturer_label`,
  });
  const currencyLabel = useWatch({ control, name: `${base}.item_currency_label` });

  // Total = Quantity x Rate, kept in sync here; the field itself is locked.
  // After its own setValue the total already matches, so this stops.
  const quantity = useWatch({ control, name: `${base}.quantity` });
  const rate = useWatch({ control, name: `${base}.item_rate` });
  const total = useWatch({ control, name: `${base}.item_total_amount` });
  React.useEffect(() => {
    const q = toNumber(quantity);
    const r = toNumber(rate);
    if (q === undefined || r === undefined) return;
    const next = Math.round(q * r * 100) / 100;
    if (toNumber(total) !== next) {
      setValue(`${base}.item_total_amount`, next, { shouldDirty: true });
    }
  }, [quantity, rate, total, base, setValue]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Item {itemIndex + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove item ${itemIndex + 1}`}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FieldShell
          label="Item name"
          required
          error={itemErrors?.item_name?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="iPhone 14 case"
              aria-describedby={describedBy}
              aria-invalid={itemErrors?.item_name ? true : undefined}
              {...register(`${base}.item_name`)}
            />
          )}
        </FieldShell>

        <FieldShell label="HS code">
          {() => (
            <Controller
              control={control}
              name={`${base}.item_hs_code`}
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value ?? ""}
                  selectedLabel={hsCodeLabel}
                  onChange={(option) => {
                    field.onChange(option.value);
                    setValue(`${base}.item_hs_code_label`, option.label);
                  }}
                  fetchPage={hsCodeFetcher}
                  placeholder="Select or type an HS code"
                  searchPlaceholder="Search HS codes…"
                  allowCustomValue
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Material">
          {() => (
            <Controller
              control={control}
              name={`${base}.item_material`}
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value ?? ""}
                  selectedLabel={materialLabel}
                  onChange={(option) => {
                    field.onChange(option.value);
                    setValue(`${base}.item_material_label`, option.label);
                  }}
                  fetchPage={materialFetcher}
                  placeholder="Select or type a material"
                  searchPlaceholder="Search materials…"
                  allowCustomValue
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Manufacturer">
          {() => (
            <Controller
              control={control}
              name={`${base}.item_manufacturer`}
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value ?? ""}
                  selectedLabel={manufacturerLabel}
                  onChange={(option) => {
                    field.onChange(option.value);
                    setValue(`${base}.item_manufacturer_label`, option.label);
                  }}
                  fetchPage={manufacturerFetcher}
                  placeholder="Select or type a manufacturer"
                  searchPlaceholder="Search manufacturers…"
                  allowCustomValue
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Gender" hint="For apparel and footwear">
          {() => (
            <Controller
              control={control}
              name={`${base}.item_gender`}
              render={({ field }) => (
                <Combobox
                  options={genderOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select gender"
                  searchPlaceholder="Search…"
                  allowCustomValue={false}
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Quantity" required error={itemErrors?.quantity?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              min="1"
              {...blockSignInputProps}
              aria-describedby={describedBy}
              aria-invalid={itemErrors?.quantity ? true : undefined}
              {...register(`${base}.quantity`)}
            />
          )}
        </FieldShell>

        <FieldShell label="Quantity code" required>
          {() => (
            <Controller
              control={control}
              name={`${base}.item_quantity_code`}
              render={({ field }) => (
                <Combobox
                  options={quantityCodeOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select or type a code"
                  searchPlaceholder="Search codes…"
                  allowCustomValue
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Rate" required error={itemErrors?.item_rate?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              step="0.01"
              {...nonNegativeInputProps}
              aria-describedby={describedBy}
              aria-invalid={itemErrors?.item_rate ? true : undefined}
              {...register(`${base}.item_rate`)}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Total amount"
          required
          error={itemErrors?.item_total_amount?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              step="any"
              readOnly
              tabIndex={-1}
              placeholder="Quantity × Rate"
              className={LOCKED_FIELD_CLASS}
              aria-describedby={describedBy}
              aria-invalid={itemErrors?.item_total_amount ? true : undefined}
              {...register(`${base}.item_total_amount`)}
            />
          )}
        </FieldShell>

        <FieldShell label="Currency" required>
          {() => (
            <Controller
              control={control}
              name={`${base}.item_currency`}
              render={({ field }) => (
                <AsyncCombobox
                  value={field.value ?? ""}
                  selectedLabel={currencyLabel}
                  onChange={(option) => {
                    field.onChange(option.value);
                    setValue(`${base}.item_currency_label`, option.label);
                  }}
                  fetchPage={currencyFetcher}
                  placeholder="Select currency"
                  searchPlaceholder="Search currencies…"
                  allowCustomValue
                />
              )}
            />
          )}
        </FieldShell>
      </div>
    </div>
  );
}
