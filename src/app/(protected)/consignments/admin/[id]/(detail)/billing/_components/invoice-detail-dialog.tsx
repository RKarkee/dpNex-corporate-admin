"use client";

import { Download, Loader2, Receipt } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

import { useConsignmentInvoice } from "../_hooks/use-consignment-invoice";
import { useDownloadConsignmentInvoicePdf } from "../_hooks/use-download-consignment-invoice-pdf";
import type { Invoice } from "../types";
import { InvoiceDetailContent, InvoiceDetailSkeleton } from "./invoice-detail-content";
import { InvoicesErrorState } from "./invoices-error-state";

/**
 * The full bill, in a dialog rather than a nested route — this tab follows
 * the same convention `DocumentViewDialog` (in the Documents tab) and the
 * Boxes tab's detail dialog use for viewing one record from within a tab.
 *
 * Re-reads the record on open rather than trusting the list row, same
 * reasoning as `DocumentViewDialog`: the paginated list response may not
 * carry every field the detail view needs (e.g. `details`, `allocations`).
 */
export function InvoiceDetailDialog({
  consignmentId,
  invoice: row,
  open,
  onOpenChange,
}: {
  consignmentId: number | string;
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useConsignmentInvoice(consignmentId, row?.id);
  const downloadPdf = useDownloadConsignmentInvoicePdf(consignmentId);
  const invoice = detail.data ?? row ?? undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" aria-hidden />
            Bill details
          </DialogTitle>
          <DialogDescription>
            {invoice ? `Invoice ${invoice.invoice_no}` : null}
          </DialogDescription>
        </DialogHeader>

        {detail.isError ? (
          <InvoicesErrorState error={detail.error} onRetry={() => detail.refetch()} />
        ) : invoice && !detail.isPending ? (
          <InvoiceDetailContent invoice={invoice} />
        ) : (
          <InvoiceDetailSkeleton />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {invoice ? (
            <Button
              onClick={() => downloadPdf.mutate({ id: invoice.id, invoiceNo: invoice.invoice_no })}
              disabled={downloadPdf.isPending}
            >
              {downloadPdf.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download PDF
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
