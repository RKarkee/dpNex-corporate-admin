import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { CONSIGNMENT_LIST_PERMISSIONS } from "./permissions";
import { RequestsView } from "./_components/requests-view";

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
      <RequestsView />
    </RequirePermission>
  );
}
