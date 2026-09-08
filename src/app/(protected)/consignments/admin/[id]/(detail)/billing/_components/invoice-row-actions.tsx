"use client";

import { Download, Eye, Loader2, MoreHorizontal } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

import { useDownloadConsignmentInvoicePdf } from "../_hooks/use-download-consignment-invoice-pdf";
import type { Invoice } from "../types";

/**
 * View and download-as-PDF for one row, behind a single trigger.
 *
 * Unlike `billing-accounts`' row actions, "View bill" here opens a dialog
 * rather than navigating to a nested route — this tab follows the same
 * Documents/Boxes convention the rest of the consignment admin detail page
 * uses for viewing one record from within a tab.
 */
export function InvoiceRowActions({
  consignmentId,
  invoice,
  onView,
}: {
  consignmentId: number | string;
  invoice: Invoice;
  onView: (invoice: Invoice) => void;
}) {
  const downloadPdf = useDownloadConsignmentInvoicePdf(consignmentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={downloadPdf.isPending}
          aria-label={`Actions for invoice ${invoice.invoice_no}`}
        >
          {downloadPdf.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreHorizontal className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onView(invoice)}>
          <Eye />
          View bill
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => downloadPdf.mutate({ id: invoice.id, invoiceNo: invoice.invoice_no })}
        >
          <Download />
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
