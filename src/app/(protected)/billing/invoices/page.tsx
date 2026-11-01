import type { Metadata } from "next";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { BillingSummary } from "./_components/billing-summary";
import { InvoicesView } from "./_components/invoices-view";
import { StatementButton } from "./_components/statement-button";
import { INVOICE_PERMISSIONS } from "./permissions";

export const metadata: Metadata = {
  title: "Invoice",
};

/**
 * Guarded by `view_billing`. The summary and the statement link each check
 * their own grant (`view_billing_summary`, `view_statement`) and simply do not
 * render without it.
 *
 * The summary used to live on its own page behind a "Bill summary" button;
 * it renders here instead, above the table, as context for the list rather
 * than a destination of its own. The statement stays a separate page — it
 * is scoped to a date range the user picks, not something that fits inline
 * above the table the way the summary does.
 */
export default function InvoicesPage() {
  return (
    <RequirePermission permission={INVOICE_PERMISSIONS.view}>
      <PageHeader
        title="Invoice"
        description="Invoices billed to your corporate account."
        actions={<StatementButton />}
      />
      <BillingSummary />
      <InvoicesView />
    </RequirePermission>
  );
}
