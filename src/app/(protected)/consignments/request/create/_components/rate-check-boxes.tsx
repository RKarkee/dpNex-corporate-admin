"use client";

import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { nonNegativeInputProps } from "@/shared/lib/number-input";

import { FieldShell } from "../../_components/field-shell";
import {
  RATE_CHECK_BOX_FIELDS,
  newRateCheckBox,
  type CheckRatesFormInput,
  type CheckRatesFormValues,
} from "./check-rates-schema";

/**
 * The boxes being priced — weight and dimensions only.
 *
 * No weight/dimension check here: that needs the via and integrator codes,
 * which only exist once a rate is chosen. The confirm step runs it on these
 * same boxes.
 */

export interface RateCheckBoxesProps {
  control: Control<CheckRatesFormInput, unknown, CheckRatesFormValues>;
  register: UseFormRegister<CheckRatesFormInput>;
  errors: FieldErrors<CheckRatesFormInput>;
}

export function RateCheckBoxes({ control, register, errors }: RateCheckBoxesProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "boxes" });

  return (
    <div className="col-span-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Boxes</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ ...newRateCheckBox })}
        >
          <Plus className="size-4" />
          Add box
        </Button>
      </div>

      {/* "Add at least one box" has no field to sit under. */}
      {errors.boxes?.root ? (
        <p role="alert" className="text-xs text-destructive">
          {errors.boxes.root.message}
        </p>
      ) : null}

      {fields.map((field, index) => {
        const boxErrors = errors.boxes?.[index];
        return (
          <div key={field.id} className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/60 px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">Box {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
                // At least one box is required, so the last cannot go.
                disabled={fields.length <= 1}
                aria-label={`Remove box ${index + 1}`}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="grid gap-5 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {RATE_CHECK_BOX_FIELDS.map(({ name, label }) => {
                const error = boxErrors?.[name]?.message;
                return (
                  <FieldShell key={name} label={label} required error={error}>
                    {({ id, describedBy }) => (
                      <Input
                        id={id}
                        type="number"
                        step="any"
                        {...nonNegativeInputProps}
                        aria-describedby={describedBy}
                        aria-invalid={error ? true : undefined}
                        {...register(`boxes.${index}.${name}`)}
                      />
                    )}
                  </FieldShell>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
