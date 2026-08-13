import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { CONSIGNMENT_ADMIN_PERMISSIONS } from "../permissions";
import { CheckRatesView } from "./_components/check-rates-view";

export const metadata: Metadata = {
  title: "New Consignment",
};

export default function NewConsignmentPage() {
  return (
    <RequirePermission anyOf={CONSIGNMENT_ADMIN_PERMISSIONS.create}>
      <PageHeader
        title="New Consignment"
        description="Step 1 of 2 — check what it costs to ship, then choose a rate."
        actions={
          <Button variant="outline" asChild>
            <Link href="/consignments/admin">
              <ArrowLeft className="size-4" />
              Back to list
            </Link>
          </Button>
        }
      />
      <CheckRatesView />
    </RequirePermission>
  );
}
