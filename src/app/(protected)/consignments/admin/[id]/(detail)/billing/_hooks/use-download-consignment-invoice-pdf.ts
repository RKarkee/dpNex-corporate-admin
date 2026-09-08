"use client";

import { useMutation } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { downloadConsignmentInvoicePdf } from "../services/consignment-billing.service";
import { downloadBlob, safeFileName } from "../_lib/download-file";

export interface DownloadConsignmentInvoicePdfInput {
  id: number | string;
  /** Used for the saved file's name; falls back to the id when blank. */
  invoiceNo: string;
}

/**
 * Fetches a bill's PDF and hands it straight to the browser's save dialog.
 *
 * A mutation rather than a query, same reasoning as
 * `useDownloadInvoicePdf`: a one-off action, no cached result worth keeping.
 */
export function useDownloadConsignmentInvoicePdf(consignmentId: number | string) {
  return useMutation({
    mutationFn: async ({ id, invoiceNo }: DownloadConsignmentInvoicePdfInput) => {
      const blob = await downloadConsignmentInvoicePdf(consignmentId, id);
      downloadBlob(blob, safeFileName(invoiceNo || `invoice-${id}`, "pdf"));
    },

    onError: (error) => {
      if (isApiError(error)) {
        toast.error({ title: "Could not download PDF", message: error.message });
        return;
      }
      toast.error(error);
    },
  });
}
