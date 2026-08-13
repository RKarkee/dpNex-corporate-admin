import type { Metadata } from "next";
// import Link from "next/link";
// import { Plus } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
// import { Button } from "@/shared/components/ui/button";

import { ConsignmentsView } from "./_components/consignments-view";
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
      <ConsignmentsView />
    </RequirePermission>
  );
}
