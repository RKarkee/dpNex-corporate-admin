"use client";

import { useMutation } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { downloadInvoicePdf } from "@/app/(protected)/billing-accounts/services/billing-invoices.service";
import { downloadBlob, safeFileName } from "../_lib/download-file";

export interface DownloadInvoicePdfInput {
  id: number | string;
  /** Used for the saved file's name; falls back to the id when blank. */
  invoiceNo: string;
}

/**
 * Fetches a bill's PDF and hands it straight to the browser's save dialog.
 *
 * A mutation rather than a query: this is a one-off action with no cached
 * result worth keeping. Each row calls this hook itself (see
 * `InvoiceRowActions`), so `isPending` is already scoped to that row's own
 * download — nothing here needs to compare against `variables`.
 */
export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async ({ id, invoiceNo }: DownloadInvoicePdfInput) => {
      const blob = await downloadInvoicePdf(id);
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
