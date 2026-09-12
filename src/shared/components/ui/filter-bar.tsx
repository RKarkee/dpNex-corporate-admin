"use client";

import * as React from "react";

import { cn } from "@/shared/lib/utils";

/**
 * The pieces a filter bar is built from: a labelled field, and a titled group
 * of them.
 *
 * Deliberately unopinionated about the control itself — a filter bar mixes
 * inputs, native selects and async comboboxes, and a shell that owned the
 * control would have to know about all three. This owns the label, the hint
 * and the rhythm; the caller passes whatever control belongs there.
 *
 * Shared rather than colocated because every list in this app grows a bar like
 * this, and two bars that look almost the same are worse than one that looks
 * identical — a user who learns one should not have to learn the other.
 */

export interface FilterFieldProps {
  label: string;
  /** A word on how the API matches this field — "Substring match", "Inclusive". */
  hint?: string;
  /** The id of the control, when it is one a `<label>` can point at. */
  htmlFor?: string;
  /** Rendered opposite the label — a Clear affordance, usually. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function FilterField({
  label,
  hint,
  htmlFor,
  action,
  className,
  children,
}: FilterFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-medium text-foreground"
        >
          {label}
        </label>
        {action}
      </div>

      {children}

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export interface FilterGroupProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A titled block of fields.
 *
 * Two columns from `sm` up, four from `lg`. Grouping is what keeps a long
 * panel readable: nine controls in one flat grid read as a wall, the same nine
 * under "Parties" and "Dates" read as two short lists.
 */
export function FilterGroup({ title, className, children }: FilterGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}
