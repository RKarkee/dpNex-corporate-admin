"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { useDownloadInvoicePdf } from "../_hooks/use-download-invoice-pdf";
import { useInvoicePermissions } from "../_hooks/use-invoice-permissions";
import { useInvoice } from "../_hooks/use-invoice";
import {
  InvoiceDetail,
  InvoiceDetailSkeleton,
} from "./_components/invoice-detail";
import { InvoiceNotFound } from "./_components/invoice-not-found";
import { INVOICE_PERMISSIONS } from "../permissions";

/** Guarded by `view_billing`; Download PDF additionally needs `print_billing`. */
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
  const { canPrint } = useInvoicePermissions();

  if (query.isError && !invoice) return <InvoiceNotFound />;

  return (
    <RequirePermission permission={INVOICE_PERMISSIONS.view}>
      <PageHeader
        title={invoice?.invoice_no ?? "Invoice"}
        description="Details for this billing invoice."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/billing/invoices">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            {canPrint ? (
              <Button
                className="flex-1 sm:flex-none"
                disabled={!invoice || downloadPdf.isPending}
                onClick={() =>
                  invoice &&
                  downloadPdf.mutate({
                    id: invoice.id,
                    invoiceNo: invoice.invoice_no,
                  })
                }
              >
                {downloadPdf.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Download PDF
              </Button>
            ) : null}
          </>
        }
      />

      {query.isLoading || !invoice ? (
        <InvoiceDetailSkeleton />
      ) : (
        <InvoiceDetail invoice={invoice} />
      )}
    </RequirePermission>
  );
}
