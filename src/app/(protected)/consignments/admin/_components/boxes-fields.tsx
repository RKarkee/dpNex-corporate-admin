"use client";

import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { Boxes, Package, Plus, Trash2 } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Combobox, type ComboboxOption } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

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

/**
 * The box tree: boxes, and the items inside each of them.
 *
 * Two nested `useFieldArray`s — one for boxes, one per box for its items. The
 * meta options are fetched once at the top and threaded down as props rather
 * than re-hooked per row: a ten-box consignment would otherwise mount dozens of
 * subscribers to the same cache entry for no benefit.
 */

export interface BoxesFieldsProps {
  control: AdminControl;
  register: AdminRegister;
  setValue: AdminSetValue;
  errors: AdminErrors;
}

export function BoxesFields({
  control,
  register,
  setValue,
  errors,
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
            onRemove={() => remove(index)}
            // The schema requires one, so the last box cannot be removed.
            canRemove={fields.length > 1}
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
}: BoxRowProps) {
  const boxErrors = errors.boxes?.[index];

  // Subscribed individually so a keystroke in one box does not re-render the
  // whole array.
  const hsCodeLabel = useWatch({ control, name: `boxes.${index}.hs_code_label` });
  const currencyLabel = useWatch({
    control,
    name: `boxes.${index}.declared_currency_label`,
  });

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
              {...register(`boxes.${index}.box_no`)}
            />
          )}
        </FieldShell>

        <FieldShell label="Weight (kg)" required error={boxErrors?.weight?.message}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="number"
              step="0.01"
              min="0"
              aria-describedby={describedBy}
              aria-invalid={boxErrors?.weight ? true : undefined}
              {...register(`boxes.${index}.weight`)}
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
              aria-describedby={describedBy}
              {...register(`boxes.${index}.volumetric_weight`)}
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
              {...register(`boxes.${index}.length`)}
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
              {...register(`boxes.${index}.width`)}
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
              {...register(`boxes.${index}.height`)}
            />
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
              aria-describedby={describedBy}
              aria-invalid={boxErrors?.no_of_pcs ? true : undefined}
              {...register(`boxes.${index}.no_of_pcs`)}
            />
          )}
        </FieldShell>

        <FieldShell label="Quantity code" required>
          {() => (
            <Controller
              control={control}
              name={`boxes.${index}.quantity_code`}
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
              min="0"
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
              min="0"
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
              step="0.01"
              min="0"
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
