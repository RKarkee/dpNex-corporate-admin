import type { Metadata } from "next";
import { FileText, Plus } from "lucide-react";

import { requirePermission } from "@/shared/auth/require-permission";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Consignment Request",
};

export default async function ConsignmentRequestPage() {
  await requirePermission("consignments.view");

  return (
    <>
      <PageHeader
        title="Consignment Request"
        description="Submit and track new consignment requests raised by agents and customers."
        actions={
          <Button>
            <Plus className="size-4" />
            New request
          </Button>
        }
      />
      <EmptyState
        icon={FileText}
        title="No requests to show"
        description="Incoming consignment requests will appear here once the API is connected."
      />
    </>
  );
}
