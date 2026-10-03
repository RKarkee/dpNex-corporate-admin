"use client";

import { cn } from "@/shared/lib/utils";

/**
 * An upload's `progress_percent` as a thin bar with the number beside it.
 * Red when the upload failed as a whole, amber when it finished with some
 * failed rows, the primary colour otherwise.
 */
export function BatchProgress({
  percent,
  status,
  hasErrors,
}: {
  percent: number | null | undefined;
  status: string;
  hasErrors: boolean;
}) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent ?? 0)) || 0));
  const upper = status.toUpperCase();
  const tone =
    upper === "FAILED" || upper === "VALIDATION_FAILED"
      ? "bg-red-500"
      : hasErrors
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full transition-all", tone)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}
