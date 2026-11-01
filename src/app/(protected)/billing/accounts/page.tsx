import { Suspense } from "react";
import type { Metadata } from "next";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { AccountsTableSkeleton } from "./_components/accounts-table";
import { AccountsView } from "./_components/accounts-view";
import { BILLING_ACCOUNT_VIEW_PERMISSIONS } from "./permissions";

export const metadata: Metadata = {
  title: "Billing Accounts",
};

/**
 * `useSearchParams` opts the view into client-side rendering, and Next
 * requires it to sit under a Suspense boundary or the build fails on
 * prerender.
 */
export default function BillingAccountsPage() {
  return (
    <RequirePermission anyOf={BILLING_ACCOUNT_VIEW_PERMISSIONS}>
      <PageHeader
        title="Billing Accounts"
        description="The accounts your invoices are billed to, and which one is your default."
      />
      <Suspense fallback={<AccountsTableSkeleton />}>
        <AccountsView />
      </Suspense>
    </RequirePermission>
  );
}
