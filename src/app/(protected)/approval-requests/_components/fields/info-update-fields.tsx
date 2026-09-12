"use client";

import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import type { ApprovalFormValues } from "../../schema";
import { infoFieldsFor, type ApprovalType } from "../../types";
import { Field } from "./field";

/**
 * The two update types: whichever attributes are being proposed.
 *
 * Every field is optional and only the ones filled in are submitted — an
 * update request carries what should change, not a full record. Leaving a
 * field blank is how you say "leave this as it is", which is also why the
 * schema insists on at least one being filled: a request to change nothing can
 * only be rejected.
 *
 * The field list is the API's own whitelist, with its own lengths, so an
 * over-long value is caught here rather than coming back as a 422.
 */
export function InfoUpdateFields({
  form,
  type,
}: {
  form: UseFormReturn<ApprovalFormValues>;
  type: ApprovalType;
}) {
  const fields = infoFieldsFor(type);
  const errors = form.formState.errors;

  // The "nothing filled in" issue is attached to `info` itself — no single
  // field is the one at fault.
  const groupError = (errors.info as { message?: string } | undefined)?.message;

  const fieldError = (name: string): string | undefined => {
    const bag = errors.info as
      | Record<string, { message?: string } | undefined>
      | undefined;
    return bag?.[name]?.message;
  };

  return (
    <div className="space-y-4">
      {groupError ? (
        <p role="alert" className="text-xs text-destructive">
          {groupError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const error = fieldError(field.name);
          const isTextarea = field.kind === "textarea";

          return (
            <Field
              key={field.name}
              label={field.label}
              error={error}
              hint={field.hint}
              className={isTextarea ? "sm:col-span-2" : undefined}
            >
              {({ id, describedBy }) =>
                isTextarea ? (
                  <Textarea
                    id={id}
                    rows={3}
                    maxLength={field.maxLength}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    {...form.register(`info.${field.name}` as const)}
                  />
                ) : (
                  <Input
                    id={id}
                    type={field.kind === "email" ? "email" : "text"}
                    maxLength={field.maxLength}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    {...form.register(`info.${field.name}` as const)}
                  />
                )
              }
            </Field>
          );
        })}
      </div>
    </div>
  );
}
