import * as React from "react";

import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

/**
 * The two building blocks every read section on this page is made of.
 *
 * Extracted from the old single-file detail view so each section can live in
 * its own module without re-declaring them — and so "what counts as empty" is
 * decided once.
 */

/** One labelled value. `0` is a value; `""`, `null` and `undefined` are not. */
export function Field({
  label,
  value,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  className?: string;
}) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "");

  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm font-medium text-foreground">
        {empty ? "—" : value}
      </p>
    </div>
  );
}

/** A titled card holding a grid of `Field`s. */
export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 border-b border-border/70 pb-3 text-base font-semibold text-foreground">
        {title}
      </h2>
      <div
        className={cn(
          "grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4",
          className,
        )}
      >
        {children}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared value formatters                                                    */
/* -------------------------------------------------------------------------- */

/** `"Y"` / `"N"` — sometimes padded — as words. */
export function yesNo(value: unknown): string {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "Y") return "Yes";
  if (trimmed === "N") return "No";
  return trimmed;
}

/**
 * A named field off a related resource the detail endpoint may not have
 * expanded — `agent`, `via`, `service` and friends arrive as objects when the
 * API joined them and are absent when it did not.
 */
export function related(resource: unknown, key: string): string | undefined {
  if (typeof resource !== "object" || resource === null) return undefined;
  const value = (resource as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
}
