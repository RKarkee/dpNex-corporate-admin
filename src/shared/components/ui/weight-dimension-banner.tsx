"use client";

import { AlertCircle, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * The subset of POST /admin/consignments/calculate-weight-dimension's
 * per-box result this banner reads. Declared locally rather than imported
 * from either consignment service — this is a generic presentational atom
 * shared by the request and admin modules, which — per the module
 * independence rule — each declare their own full copy of the response type.
 */
export interface WeightDimensionCheckSummary {
  divisor?: number | string | null;
  oversize_exception?: string | null;
  overweight_exception?: string | null;
  exception_types?: string[] | null;
}

export type WeightDimensionCheckStatus = "idle" | "checking" | "success" | "error";

interface WeightDimensionBannerProps {
  status: WeightDimensionCheckStatus;
  result?: WeightDimensionCheckSummary | null;
  errorMessage?: string | null;
  className?: string;
}

/**
 * Live status for the box weight/dimension check, shown per box just above
 * its Items section. Only surfaces something when there's actually a flag to
 * acknowledge — a clean box (no oversize/overweight exception and no entries
 * in exception_types) renders nothing, same as a box that hasn't been
 * checked yet.
 */
export function WeightDimensionBanner({
  status,
  result,
  errorMessage,
  className,
}: WeightDimensionBannerProps) {
  if (status === "idle") return null;

  if (status === "checking") {
    return (
      <div className={cn("flex items-center gap-2 text-gray-500 text-sm", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking weight & dimensions...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 bg-red-50 p-3 border border-red-200 rounded-md text-red-800 text-sm",
          className,
        )}
      >
        <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
        <span>{errorMessage || "Failed to calculate weight/dimension."}</span>
      </div>
    );
  }

  if (!result) return null;

  const exceptionTypes = result.exception_types ?? [];
  const hasFlag =
    Boolean(result.oversize_exception) ||
    Boolean(result.overweight_exception) ||
    exceptionTypes.length > 0;

  // Nothing wrong — the caller's own fields already show the checked values,
  // so a clean result needs no separate banner.
  if (!hasFlag) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 bg-amber-50 p-3 border border-amber-200 rounded-md text-amber-900 text-sm",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 w-4 h-4 shrink-0" />
      <div className="space-y-0.5">
        {result.oversize_exception && <div>Oversize: {result.oversize_exception}</div>}
        {result.overweight_exception && <div>Overweight: {result.overweight_exception}</div>}
        {exceptionTypes.length > 0 && <div>Flags: {exceptionTypes.join(", ")}</div>}
        {result.divisor != null && (
          <div className="opacity-75 text-xs">Divisor: {result.divisor}</div>
        )}
      </div>
    </div>
  );
}
