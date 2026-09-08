"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { CONSIGNMENT_ADMIN_PERMISSIONS } from "../../../permissions";
import { useConsignmentInvoice } from "../../(detail)/billing/_hooks/use-consignment-invoice";
import { useConsignmentInvoiceParticulars } from "../../(detail)/billing/_hooks/use-consignment-invoice-particulars";
import { useConsignmentInvoiceAdjustments } from "../../(detail)/billing/_hooks/use-consignment-invoice-adjustments";
import { useConsignmentInvoicePayments } from "../../(detail)/billing/_hooks/use-consignment-invoice-payments";
import { useDownloadConsignmentInvoicePdf } from "../../(detail)/billing/_hooks/use-download-consignment-invoice-pdf";
import {
  InvoiceDetailContent,
  InvoiceDetailSkeleton,
} from "../../(detail)/billing/_components/invoice-detail-content";
import { InvoiceNotFound } from "./_components/invoice-not-found";

/**
 * A single bill, on its own page — `GET
 * /corporate/consignments/{consignmentId}/billings/{billingId}`.
 *
 * Deliberately outside the `(detail)` route group, the same way
 * `consignments/admin/[id]/edit` sits outside it: a bill is a document to
 * read or print, not a tab of the consignment, so it drops the tab chrome
 * rather than rendering inside it. It still reuses every piece the Billing
 * tab already built (`InvoiceDetailContent`, the invoice hooks) — only the
 * page frame around them changes.
 */
export default function ConsignmentInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; billingId: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id: consignmentId, billingId } = React.use(params);

  const query = useConsignmentInvoice(consignmentId, billingId);
  const invoice = query.data;
  const downloadPdf = useDownloadConsignmentInvoicePdf(consignmentId);

  // Fetched independently of the invoice read — see `.../particulars`.
  // Falls back to the invoice's own embedded `details` while this is still
  // in flight (or if it fails outright), so the charges section never has to
  // sit empty waiting on a second request the invoice read already answered.
  const particularsQuery = useConsignmentInvoiceParticulars(consignmentId, billingId);
  const particulars = particularsQuery.data ?? invoice?.details;

  // Fetched independently of the invoice read — see `.../payments`.
  // `InvoiceDetailContent` falls back to `invoice.allocations` on its own
  // while this is still in flight or if it fails, so `undefined` here (no
  // response yet) is a perfectly fine value to pass down.
  const paymentsQuery = useConsignmentInvoicePayments(consignmentId, billingId);
  const payments = paymentsQuery.data;

  // Fetched independently of the invoice read — see `.../adjustments`. No
  // embedded field on the invoice detail read backs this one (unlike
  // particulars/payments), so there is nothing to fall back to while this is
  // in flight — the section simply does not render until it resolves.
  const adjustmentsQuery = useConsignmentInvoiceAdjustments(consignmentId, billingId);
  const adjustments = adjustmentsQuery.data;

  if (query.isError && !invoice) {
    return (
      <RequirePermission anyOf={CONSIGNMENT_ADMIN_PERMISSIONS.view}>
        <InvoiceNotFound consignmentId={consignmentId} />
      </RequirePermission>
    );
  }

  return (
    <RequirePermission anyOf={CONSIGNMENT_ADMIN_PERMISSIONS.view}>
      <PageHeader
        title={invoice?.invoice_no ?? "Invoice"}
        description="Details for this billing invoice."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href={`/consignments/admin/${consignmentId}/billing`}>
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
        <InvoiceDetailContent
          invoice={invoice}
          particulars={particulars}
          payments={payments}
          adjustments={adjustments}
        />
      )}
    </RequirePermission>
  );
}
