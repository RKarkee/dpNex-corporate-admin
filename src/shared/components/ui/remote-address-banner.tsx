"use client";

import { AlertCircle, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/**
 * The subset of POST /admin/consignments/check-remote-address's
 * `data.remote_check` object this banner reads. Declared locally rather than
 * imported from either consignment service: this is a generic presentational
 * atom shared by the request and admin modules, which — per the module
 * independence rule — each declare their own full copy of the response type.
 */
export interface RemoteAddressCheckResult {
  is_remote: boolean;
  display_message?: string | null;
  customer_message?: string | null;
  total_extra_charge?: number | string | null;
}

export type RemoteAddressCheckStatus = "idle" | "checking" | "success" | "error";

interface RemoteAddressBannerProps {
  status: RemoteAddressCheckStatus;
  result?: RemoteAddressCheckResult | null;
  errorMessage?: string | null;
  className?: string;
}

/**
 * Live status for the receiver-address remote-surcharge check, shown
 * wherever a receiver address is entered or edited (create/edit consignment
 * form, and the standalone Update Receiver dialog). Renders nothing until a
 * check has actually run, so an untouched or incomplete address shows no
 * banner at all.
 */
export function RemoteAddressBanner({
  status,
  result,
  errorMessage,
  className,
}: RemoteAddressBannerProps) {
  if (status === "idle") return null;

  if (status === "checking") {
    return (
      <div className={cn("flex items-center gap-2 text-gray-500 text-sm", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking remote address...
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
        <span>{errorMessage || "Failed to check remote address."}</span>
      </div>
    );
  }

  if (!result) return null;

  if (result.is_remote) {
    const message =
      result.display_message ||
      result.customer_message ||
      "This address is flagged as remote — additional charges may apply.";
    const extra = Number(result.total_extra_charge ?? 0);

    return (
      <div
        className={cn(
          "flex items-start gap-2 bg-amber-50 p-3 border border-amber-200 rounded-md text-amber-900 text-sm",
          className,
        )}
      >
        <TriangleAlert className="mt-0.5 w-4 h-4 shrink-0" />
        <span>
          {message}
          {extra > 0 ? ` (+${extra.toFixed(2)} extra charge)` : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 bg-green-50 p-3 border border-green-200 rounded-md text-green-800 text-sm",
        className,
      )}
    >
      <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" />
      <span>No remote surcharge applies to this address.</span>
    </div>
  );
}
