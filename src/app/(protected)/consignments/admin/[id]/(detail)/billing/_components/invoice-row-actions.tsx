"use client";

import Link from "next/link";
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
 * "View bill" opens on its own page — `/consignments/admin/{id}/billing/
 * {invoiceId}` — rather than a dialog: a bill is a document to read or print,
 * and `asChild` + `Link` makes it a real anchor, so middle-click and "open in
 * new tab" both work.
 */
export function InvoiceRowActions({
  consignmentId,
  invoice,
}: {
  consignmentId: number | string;
  invoice: Invoice;
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
        <DropdownMenuItem asChild>
          <Link href={`/consignments/admin/${consignmentId}/billing/${invoice.id}`}>
            <Eye />
            View bill
          </Link>
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
