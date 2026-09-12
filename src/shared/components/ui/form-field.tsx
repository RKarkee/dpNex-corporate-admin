"use client";

import * as React from "react";

import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

/**
 * Label, control, message — the rhythm every form field in this app follows.
 *
 * Takes the control as a render prop rather than owning it, because forms here
 * mix inputs, textareas, native selects and async comboboxes; a shell that
 * owned the control would have to know about all four. The id is handed down so
 * the label and the error message can point at whatever the caller rendered.
 *
 * Distinct from `FilterField` next door: that one is a filter's label and hint,
 * with no required marker and no error slot, because a filter cannot be invalid.
 */
export interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
}

export function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  const id = React.useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {/* `aria-hidden`: the control's own `required` is what assistive tech
            announces, and a stray star per field is noise. */}
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
