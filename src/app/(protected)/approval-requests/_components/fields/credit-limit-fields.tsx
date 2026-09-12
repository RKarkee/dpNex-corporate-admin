"use client";

import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/shared/components/ui/input";

import type { ApprovalFormValues } from "../../schema";
import { Field } from "@/shared/components/ui/form-field";

/**
 * The whole of a credit-limit request: the limit being asked for.
 *
 * `inputMode="decimal"` rather than `type="number"` — a number input swallows
 * scroll wheel events into value changes and drops the thousands separators
 * people type out of habit. The schema validates the string.
 */
export function CreditLimitFields({
  form,
}: {
  form: UseFormReturn<ApprovalFormValues>;
}) {
  const error = form.formState.errors.credit_limit?.message;

  return (
    <Field
      label="Proposed credit limit"
      required
      error={error}
      hint="The total limit you are asking for, not the increase"
    >
      {({ id, describedBy }) => (
        <Input
          id={id}
          inputMode="decimal"
          placeholder="250000"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...form.register("credit_limit")}
        />
      )}
    </Field>
  );
}
