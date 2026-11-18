import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * One labelled value inside a `<dl>`. Blank, `null` and `undefined` render as
 * a dash, so a field the API left out reads as "not provided". `0` is a value.
 */
export function InfoItem({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  const empty =
    value === null || value === undefined || (typeof value === "string" && value.trim() === "");

  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <dt className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="break-words text-sm font-medium text-foreground">{empty ? "—" : value}</dd>
    </div>
  );
}
