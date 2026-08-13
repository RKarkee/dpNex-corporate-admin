"use client";

import * as React from "react";

import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

/**
 * Label, control, message — the rhythm every field on the consignment form
 * follows.
 *
 * The control is a child rather than something this owns, because half the
 * fields here are comboboxes with no DOM value to read back.
 */

let sequence = 0;

export interface FieldShellProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  /** Receives the id to hang `htmlFor` and `aria-describedby` off. */
  children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
}

export function FieldShell({
  label,
  required,
  error,
  hint,
  className,
  children,
}: FieldShellProps) {
  // `useId` would be ideal, but a stable id is needed inside `useFieldArray`
  // rows, which remount on reorder — React's id changes there and the label
  // would briefly point at nothing.
  const [id] = React.useState(() => `admin-field-${++sequence}`);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {/* `aria-hidden`: the control's own `required` is what assistive tech
            announces, and a stray "star" per field is noise. */}
        {required ? (
          <span
            aria-hidden
            className="text-sm font-semibold leading-none text-destructive"
          >
            *
          </span>
        ) : null}
      </div>

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

/** A titled block of fields inside a card. */
export function FieldGroup({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            {Icon ? <Icon className="size-4 text-primary" /> : null}
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {children}
      </div>
    </section>
  );
}
