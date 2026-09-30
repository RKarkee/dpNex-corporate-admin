"use client";

import { useMutation } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { downloadBlob } from "../_lib/download-file";
import { exportBillingReport } from "../services/billing-report.service";
import type { BillingReportParams } from "../types";

/**
 * Downloads the billing report for the current filters and hands it
 * straight to the browser's save dialog.
 *
 * A mutation rather than a query: this is a one-off action with no cached
 * result worth keeping.
 */
export function useExportBillingReport() {
  return useMutation({
    mutationFn: async (params: BillingReportParams) => {
      const { blob, filename } = await exportBillingReport(params);
      downloadBlob(blob, filename);
    },

    onError: (error) => {
      if (isApiError(error)) {
        toast.error({ title: "Could not download the report", message: error.message });
        return;
      }
      toast.error(error);
    },
  });
}
