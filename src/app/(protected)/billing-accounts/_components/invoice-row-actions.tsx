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

import { useDownloadInvoicePdf } from "../_hooks/use-download-invoice-pdf";
import type { Invoice } from "../types";

/**
 * View and download-as-PDF for one row, behind a single trigger.
 *
 * Two actions did not earn two pinned icon buttons the way the users table's
 * view/edit/delete trio does — a menu keeps this column the same width as a
 * single icon button, and has room to grow if more bill actions show up.
 */
export function InvoiceRowActions({ invoice }: { invoice: Invoice }) {
  const downloadPdf = useDownloadInvoicePdf();

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
        {/* `asChild` + `Link` rather than `router.push`, so it is a real
            anchor — middle-click and "open in new tab" both work. */}
        <DropdownMenuItem asChild>
          <Link href={`/billing-accounts/${invoice.id}`}>
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
