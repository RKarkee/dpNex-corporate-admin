import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { CONSIGNMENT_LIST_PERMISSIONS } from "./permissions";
import { RequestsLanding } from "./_components/requests-landing";
import { RequestsTableSkeleton } from "./_components/requests-table";

export const metadata: Metadata = {
  title: "Consignment Requests",
};

export default function ConsignmentRequestPage() {
  return (
    <RequirePermission anyOf={CONSIGNMENT_LIST_PERMISSIONS}>
      <PageHeader
        title="Consignment Requests"
        description="Raise new consignment requests and track the ones already submitted."
        actions={
          <Button asChild>
            <Link href="/consignments/request/create">
              <Plus className="size-4" />
              New request
            </Link>
          </Button>
        }
      />
      {/* `useSearchParams` (the open tab) needs a Suspense boundary above it or
          the build fails on prerender; the fallback shows only before hydration. */}
      <Suspense fallback={<RequestsTableSkeleton />}>
        <RequestsLanding />
      </Suspense>
    </RequirePermission>
  );
}
