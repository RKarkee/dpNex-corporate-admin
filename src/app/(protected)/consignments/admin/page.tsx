import type { Metadata } from "next";
import { Shield } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = {
  title: "Consignment Admin",
};

export default function ConsignmentAdminPage() {
  return (
    <>
      <PageHeader
        title="Consignment Admin"
        description="Approve, reject and reassign consignments across the network."
      />
      <EmptyState
        icon={Shield}
        title="Nothing awaiting approval"
        description="Consignments pending administrative action will be listed here."
      />
    </>
  );
}
