import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { BillingSummary } from "./_components/billing-summary";
import { InvoicesView } from "./_components/invoices-view";

export const metadata: Metadata = {
  title: "Billing Accounts",
};

/**
 * No `RequirePermission` wrapper: the nav entry for this page
 * (`nav-constant.ts`) leaves its permission names commented out too — they
 * are unconfirmed for this CRM-admin resource. The API still scopes every
 * call to the caller's own corporate regardless.
 *
 * The summary used to live on its own page behind a "Bill summary" button;
 * it renders here instead, above the table, as context for the list rather
 * than a destination of its own. The statement stays a separate page — it
 * is scoped to a date range the user picks, not something that fits inline
 * above the table the way the summary does.
 */
export default function BillingAccountsPage() {
  return (
    <>
      <PageHeader
        title="Billing Accounts"
        description="Invoices billed to your corporate account."
        actions={
          <Button variant="outline" asChild>
            <Link href="/billing-accounts/statement">
              <FileText className="size-4" />
              Bill statement
            </Link>
          </Button>
        }
      />
      <BillingSummary />
      <InvoicesView />
    </>
  );
}
