"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * A styled `<select>`, for short closed lists — Yes/No, address type.
 *
 * A native control rather than a custom listbox: it is keyboard- and
 * screen-reader-correct for free, and opens as the platform picker on mobile.
 * The searchable `Combobox` is for lists long enough to need filtering.
 */

export interface NativeSelectOption {
  value: string;
  label: string;
}

export interface NativeSelectProps
  extends Omit<React.ComponentProps<"select">, "children"> {
  options: readonly NativeSelectOption[];
  /** Rendered as a disabled first entry, so the field can start empty. */
  placeholder?: string;
}

export function NativeSelect({
  className,
  options,
  placeholder,
  ...props
}: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "flex h-11 w-full appearance-none rounded-lg border border-transparent bg-secondary px-3.5 py-2 pr-10 text-sm text-foreground transition-colors",
          "focus-visible:border-ring/40 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive/50 aria-invalid:ring-2 aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* `appearance-none` removed the platform arrow, so it is drawn back
          here. `pointer-events-none` keeps the click falling through to the
          select — an icon that swallowed it would deaden the field's right edge. */}
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
