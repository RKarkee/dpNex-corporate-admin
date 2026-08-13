"use client";

import * as React from "react";
import type { UseFormRegister } from "react-hook-form";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

import type { ProfileFormValues } from "../schema";

/**
 * Label → control → message, the rhythm every field on this page follows.
 *
 * Distinct from the consignment form's `FieldShell`, which puts the required
 * marker on the right of the row; the reference layout this page mirrors puts a
 * red asterisk directly after the label text, and its labels can carry a small
 * leading icon.
 */

let sequence = 0;

export interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** A small icon before the label text — the reference uses one on "Notes". */
  labelIcon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
}

export function Field({
  label,
  required,
  error,
  hint,
  labelIcon: Icon,
  className,
  children,
}: FieldProps) {
  // `useId` would be ideal, but a stable id is needed inside `useFieldArray`
  // rows, which remount on reorder — React's id changes there and the label
  // would briefly point at nothing.
  const [id] = React.useState(() => `profile-field-${++sequence}`);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={Icon ? "flex items-center gap-1" : undefined}>
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
        {/* `aria-hidden`: the control's own `required`/`aria-required` is what
            assistive tech announces, and a spoken "star" per field is noise. */}
        {required ? (
          <span aria-hidden className="text-destructive">
            {" *"}
          </span>
        ) : null}
      </Label>

      {children({ id, describedBy })}

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Every telephone field name the two forms use, flat and nested. */
type TelephoneName =
  | "telephone_1"
  | "telephone_2"
  | `addresses.${number}.telephone_1`
  | `addresses.${number}.telephone_2`;

type TelephoneExtName =
  | "telephone_1_ext"
  | "telephone_2_ext"
  | `addresses.${number}.telephone_1_ext`
  | `addresses.${number}.telephone_2_ext`;

/**
 * A landline and its extension, under one label.
 *
 * **The extension comes first**, which is what the reference does and is worth
 * not "correcting": on these forms the ext is the short, often-empty field, and
 * leading with it keeps the long number inputs aligned down the column.
 *
 * They share one label because they are one phone number — two separate
 * labelled fields would imply the extension can stand alone. The ext input
 * carries its own accessible name so it is still announced distinctly.
 */
export function TelephonePair({
  label,
  register,
  numberName,
  extName,
  extWidth = "w-20",
}: {
  label: string;
  register: UseFormRegister<ProfileFormValues>;
  numberName: TelephoneName;
  extName: TelephoneExtName;
  /** Address rows are tighter than the top-level contact card. */
  extWidth?: string;
}) {
  return (
    <Field label={label}>
      {({ id }) => (
        <div className="flex gap-2">
          <Input
            aria-label={`${label} extension`}
            placeholder="Ext"
            className={cn("shrink-0", extWidth)}
            {...register(extName)}
          />
          <Input
            id={id}
            type="tel"
            placeholder="01-XXXXXXX"
            className="flex-1"
            {...register(numberName)}
          />
        </div>
      )}
    </Field>
  );
}
