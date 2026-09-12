import { Suspense } from "react";
import type { Metadata } from "next";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { ApprovalsTableSkeleton } from "./_components/approvals-table";
import { ApprovalsView } from "./_components/approvals-view";
import { NewRequestButton } from "./_components/new-request-button";
import { APPROVAL_LIST_PERMISSIONS } from "./permissions";

export const metadata: Metadata = {
  title: "Approval Requests",
};

/**
 * `useSearchParams` opts the view into client-side rendering, and Next requires
 * it to sit under a Suspense boundary or the build fails on prerender. The
 * fallback is only ever shown for the instant before hydration.
 */
export default function ApprovalRequestsPage() {
  return (
    <RequirePermission anyOf={APPROVAL_LIST_PERMISSIONS}>
      <PageHeader
        title="Approval Requests"
        description="Changes that need someone else's agreement — credit limits, discounts and updates to your details."
        actions={<NewRequestButton />}
      />
      <Suspense fallback={<ApprovalsTableSkeleton />}>
        <ApprovalsView />
      </Suspense>
    </RequirePermission>
  );
}
