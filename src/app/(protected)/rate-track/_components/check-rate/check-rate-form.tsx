"use client";

import * as React from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PackageSearch, Plus, Trash2 } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";
import { FieldShell } from "@/app/(protected)/consignments/request/_components/field-shell";
import { LocationFields } from "@/app/(protected)/consignments/request/_components/location-fields";
import { packageTypeFetcher } from "@/app/(protected)/consignments/request/_components/lookup-fetchers";

import type { CheckRatesInput } from "../../types";
import {
  CHECK_RATES_DEFAULTS,
  DIMENSIONS,
  EMPTY_BOX,
  checkRatesSchema,
  toCheckRatesInput,
  type CheckRatesFormValues,
  type Dimension,
} from "./check-rate-schema";

/**
 * The rate-check form — destination and shipment.
 *
 * Only a country is required; state, city and ZIP narrow the answer, so
 * nothing marks them required. Weight is one total or a list of boxes, chosen
 * with the toggle — the API wants exactly one of the two.
 *
 * The location fields, field shell and package-type lookup are the
 * consignment request form's own, so a quote and a request read a
 * destination the same way.
 */

const CONTROL = "h-11 rounded-lg px-3.5";

const DIMENSION_LABELS: Record<Dimension, string> = {
  length: "Length (cm)",
  width: "Width (cm)",
  height: "Height (cm)",
  weight: "Weight (kg)",
};

export function CheckRateForm({
  pending,
  onSubmit,
  onReset,
}: {
  pending: boolean;
  onSubmit: (input: CheckRatesInput) => void;
  onReset: () => void;
}) {
  // The picker stores the code; the label is kept only because it has to show
  // *something* for a value before — or without — the list that resolves it.
  const [packageLabel, setPackageLabel] = React.useState("");
  const { rateCheckItemTypeOptions } = useMetaOptions();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CheckRatesFormValues>({
    resolver: zodResolver(checkRatesSchema),
    defaultValues: CHECK_RATES_DEFAULTS,
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "boxes" });

  const country = useWatch({ control, name: "receiver_country" }) ?? "";
  const state = useWatch({ control, name: "receiver_state" }) ?? "";
  const mode = useWatch({ control, name: "mode" });

  function chooseMode(next: "weight" | "boxes") {
    setValue("mode", next);
    // Start box mode with one row, so it is usable at once rather than a bare
    // "Add a box" and an error.
    if (next === "boxes" && fields.length === 0) append({ ...EMPTY_BOX });
  }

  function handleReset() {
    reset(CHECK_RATES_DEFAULTS);
    replace([]);
    setPackageLabel("");
    onReset();
  }

  const message = (value: unknown): string | undefined =>
    typeof value === "string" ? value : undefined;

  return (
    <Card className="p-4 sm:p-6">
      <form
        onSubmit={handleSubmit((values) => onSubmit(toCheckRatesInput(values)))}
        noValidate
        className="space-y-6"
      >
        <section className="space-y-4">
          <SectionTitle>Destination</SectionTitle>

          <LocationFields
            control={control}
            setValue={setValue}
            countryName="receiver_country"
            stateName="receiver_state"
            stateNameField="receiver_state_name"
            cityName="receiver_city"
            countryValue={country}
            stateValue={state}
            onCountryChange={() => {
              setValue("receiver_state", "");
              setValue("receiver_state_name", "");
              setValue("receiver_city", "");
            }}
            onStateChange={() => setValue("receiver_city", "")}
            countryError={message(errors.receiver_country?.message)}
            stateError={message(errors.receiver_state?.message)}
            cityError={message(errors.receiver_city?.message)}
            optionalStateCity
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldShell label="ZIP / postal code" error={message(errors.receiver_zip?.message)}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  {...register("receiver_zip")}
                  maxLength={20}
                  disabled={pending}
                  aria-describedby={describedBy}
                  className={CONTROL}
                />
              )}
            </FieldShell>

            <FieldShell label="Address line 1" error={message(errors.receiver_address_1?.message)}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  {...register("receiver_address_1")}
                  maxLength={150}
                  disabled={pending}
                  aria-describedby={describedBy}
                  className={CONTROL}
                />
              )}
            </FieldShell>

            <FieldShell
              label="Address line 2"
              error={message(errors.receiver_address_2?.message)}
              className="sm:col-span-2 lg:col-span-1"
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  {...register("receiver_address_2")}
                  maxLength={150}
                  disabled={pending}
                  aria-describedby={describedBy}
                  className={CONTROL}
                />
              )}
            </FieldShell>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Shipment</SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Package type">
              {() => (
                <Controller
                  control={control}
                  name="package_type"
                  render={({ field }) => (
                    <AsyncCombobox
                      value={field.value ?? ""}
                      selectedLabel={packageLabel}
                      onChange={(option) => {
                        field.onChange(option.value);
                        setPackageLabel(option.value ? option.label : "");
                      }}
                      fetchPage={packageTypeFetcher}
                      placeholder="Select package type"
                      searchPlaceholder="Search package types…"
                      minSearchLength={0}
                      clearable
                      disabled={pending}
                      className="w-full"
                    />
                  )}
                />
              )}
            </FieldShell>

            <FieldShell label="Item type">
              {() => (
                <Controller
                  control={control}
                  name="item_type"
                  render={({ field }) => (
                    <Combobox
                      options={rateCheckItemTypeOptions}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Select item type"
                      searchPlaceholder="Search item types…"
                      allowCustomValue={false}
                      disabled={pending}
                      className="w-full"
                    />
                  )}
                />
              )}
            </FieldShell>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Weight entry</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <WeightModeOption
                checked={mode === "weight"}
                onSelect={() => chooseMode("weight")}
                title="Total weight"
                disabled={pending}
              />
              <WeightModeOption
                checked={mode === "boxes"}
                onSelect={() => chooseMode("boxes")}
                title="Box dimensions"
                disabled={pending}
              />
            </div>
          </fieldset>

          {mode === "weight" ? (
            <FieldShell
              className="sm:max-w-xs"
              label="Total weight (kg)"
              required
              error={message(errors.total_weight?.message)}
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 10"
                  {...register("total_weight")}
                  disabled={pending}
                  aria-invalid={errors.total_weight ? true : undefined}
                  aria-describedby={describedBy}
                  className={CONTROL}
                />
              )}
            </FieldShell>
          ) : (
            <div className="space-y-3">
              {fields.map((box, index) => (
                <div key={box.id} className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Box {index + 1}</p>
                    {fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={pending}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        <span className="sr-only">Remove box {index + 1}</span>
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {DIMENSIONS.map((key) => (
                      <FieldShell
                        key={key}
                        label={DIMENSION_LABELS[key]}
                        required
                        error={message(errors.boxes?.[index]?.[key]?.message)}
                      >
                        {({ id, describedBy }) => (
                          <Input
                            id={id}
                            type="number"
                            step="any"
                            inputMode="decimal"
                            {...register(`boxes.${index}.${key}` as const)}
                            disabled={pending}
                            aria-describedby={describedBy}
                            className={CONTROL}
                          />
                        )}
                      </FieldShell>
                    ))}
                  </div>
                </div>
              ))}

              {message(errors.boxes?.message) ? (
                <p role="alert" className="text-xs text-destructive">
                  {message(errors.boxes?.message)}
                </p>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ ...EMPTY_BOX })}
                disabled={pending}
                className="h-11 w-full rounded-lg sm:w-auto"
              >
                <Plus className="size-4" aria-hidden />
                Add another box
              </Button>
            </div>
          )}
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={pending}
            className="h-11 rounded-lg px-6"
          >
            Reset
          </Button>
          <Button type="submit" disabled={pending} className="h-11 gap-2 rounded-lg px-8">
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <PackageSearch className="size-4" aria-hidden />
            )}
            Check rates
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-border/70 pb-2 text-sm font-semibold text-foreground">
      {children}
    </h2>
  );
}

/**
 * One choice in the weight-entry group — a real radio input, so keyboard
 * arrows and screen readers work. The whole bordered row is the label.
 */
function WeightModeOption({
  checked,
  onSelect,
  title,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex h-11 cursor-pointer items-center gap-3 rounded-lg border px-3.5 text-sm font-medium transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
        checked
          ? "border-primary text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        name="weight-mode"
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        className="size-4 accent-primary"
      />
      {title}
    </label>
  );
}
