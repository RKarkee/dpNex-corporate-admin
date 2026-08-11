import type { Metadata } from "next";
import { Shield } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = {
  title: "Consignment Admin",
};

export default function ConsignmentAdminPage() {

  return (
    <RequirePermission anyOf={["approve_consignment", "view_any_consignment"]}>
      <PageHeader
        title="Consignment Admin"
        description="Approve, reject and reassign consignments across the network."
      />
      <EmptyState
        icon={Shield}
        title="Nothing awaiting approval"
        description="Consignments pending administrative action will be listed here."
      />
    </RequirePermission>
  );
}
