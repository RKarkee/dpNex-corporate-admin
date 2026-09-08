"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { useDownloadInvoicePdf } from "../_hooks/use-download-invoice-pdf";
import { useInvoice } from "../_hooks/use-invoice";
import { InvoiceDetail, InvoiceDetailSkeleton } from "./_components/invoice-detail";
import { InvoiceNotFound } from "./_components/invoice-not-found";

/**
 * No `RequirePermission` wrapper here either — same reasoning as the list
 * page: the permission names for this resource are unconfirmed, and the API
 * still scopes every read to the caller's own corporate.
 */
export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  const query = useInvoice(id);
  const invoice = query.data;
  const downloadPdf = useDownloadInvoicePdf();

  if (query.isError && !invoice) return <InvoiceNotFound />;

  return (
    <>
      <PageHeader
        title={invoice?.invoice_no ?? "Invoice"}
        description="Details for this billing invoice."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/billing-accounts">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            <Button
              className="flex-1 sm:flex-none"
              disabled={!invoice || downloadPdf.isPending}
              onClick={() =>
                invoice &&
                downloadPdf.mutate({ id: invoice.id, invoiceNo: invoice.invoice_no })
              }
            >
              {downloadPdf.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download PDF
            </Button>
          </>
        }
      />

      {query.isLoading || !invoice ? (
        <InvoiceDetailSkeleton />
      ) : (
        <InvoiceDetail invoice={invoice} />
      )}
    </>
  );
}
