import { Suspense } from "react";
import type { Metadata } from "next";
// import Link from "next/link";
// import { Plus } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
// import { Button } from "@/shared/components/ui/button";

import { ConsignmentsLanding } from "./_components/consignments-landing";
import { ConsignmentsTableSkeleton } from "./_components/consignments-table";
import { CONSIGNMENT_ADMIN_PERMISSIONS } from "./permissions";

export const metadata: Metadata = {
  title: "Consignment Admin",
};

export default function ConsignmentAdminPage() {
  return (
    <RequirePermission anyOf={CONSIGNMENT_ADMIN_PERMISSIONS.view}>
      <PageHeader
        title="Consignment Admin"
        description="Create, track and manage consignments across the network."
        // actions={
        //   <Button asChild>
        //     <Link href="/consignments/admin/new">
        //       <Plus className="size-4" />
        //       New consignment
        //     </Link>
        //   </Button>
        // }
      />
      {/* `useSearchParams` (the open tab) needs a Suspense boundary above it or
          the build fails on prerender; the fallback shows only before hydration. */}
      <Suspense fallback={<ConsignmentsTableSkeleton />}>
        <ConsignmentsLanding />
      </Suspense>
    </RequirePermission>
  );
}
