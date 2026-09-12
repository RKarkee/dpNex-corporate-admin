"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";

import type { ApprovalFormValues } from "../../schema";
import { DISCOUNT_TYPES } from "../../types";
import { consignmentFetcher } from "../lookup-fetchers";
import { Field } from "@/shared/components/ui/form-field";

const DISCOUNT_TYPE_OPTIONS = [
  { value: DISCOUNT_TYPES[0], label: "Fixed amount" },
  { value: DISCOUNT_TYPES[1], label: "Percentage" },
];

/**
 * A discount request: which consignment, and how much off.
 *
 * The only type whose subject the user picks. `/consignments/get-lists` is
 * already scoped to the caller, so the list cannot offer someone else's
 * shipment — but it runs long, which is why it is a searchable combobox that
 * pages as you scroll rather than a select.
 *
 * `subject_id` is what is sent and `subject_label` is what is shown; the label
 * is kept in form state because the trigger has to render something before the
 * list that would resolve it has been opened.
 */
export function DiscountFields({
  form,
}: {
  form: UseFormReturn<ApprovalFormValues>;
}) {
  const { errors } = form.formState;
  // `useWatch` keeps the React Compiler able to memoise this component; a bare
  // `form.watch` hands back a new function identity on every render.
  const discountType = useWatch({ control: form.control, name: "discount_type" });
  const subjectId = useWatch({ control: form.control, name: "subject_id" });
  const subjectLabel = useWatch({ control: form.control, name: "subject_label" });

  return (
    <div className="space-y-4">
      <Field
        label="Consignment"
        required
        error={errors.subject_id?.message}
        hint="Only your own consignments are listed"
      >
        {() => (
          <AsyncCombobox
            value={subjectId}
            selectedLabel={subjectLabel || undefined}
            onChange={(option) => {
              form.setValue("subject_id", option.value, {
                shouldValidate: true,
                shouldDirty: true,
              });
              form.setValue("subject_label", option.label, {
                shouldDirty: true,
              });
            }}
            fetchPage={consignmentFetcher}
            placeholder="Choose a consignment"
            searchPlaceholder="Search consignments…"
            emptyText="No consignments found"
            aria-invalid={Boolean(errors.subject_id)}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Discount type" required error={errors.discount_type?.message}>
          {({ id, describedBy }) => (
            <NativeSelect
              id={id}
              options={DISCOUNT_TYPE_OPTIONS}
              aria-describedby={describedBy}
              {...form.register("discount_type")}
            />
          )}
        </Field>

        <Field
          label={discountType === "PERCENTAGE" ? "Percentage off" : "Amount off"}
          required
          error={errors.discount_value?.message}
          // The unit is the half of this field that changes meaning, so the
          // hint says it rather than leaving "1500" to be read as a percentage.
          hint={
            discountType === "PERCENTAGE"
              ? "Between 0 and 100"
              : "A flat amount off the consignment"
          }
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              inputMode="decimal"
              placeholder={discountType === "PERCENTAGE" ? "10" : "1500"}
              aria-invalid={Boolean(errors.discount_value)}
              aria-describedby={describedBy}
              {...form.register("discount_value")}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
