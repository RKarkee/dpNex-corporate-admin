"use client";

import * as React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { ConsignmentDetailView } from "../_components/consignment-detail";
import { CONSIGNMENT_ADMIN_PERMISSIONS } from "../permissions";

export default function ConsignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const consignmentId = Number(id);

  // A non-numeric id can never resolve, so it is answered here rather than
  // spent on a request that is certain to 404.
  if (!Number.isFinite(consignmentId)) {
    return (
      <>
        <PageHeader title="Consignment" />
        <EmptyState
          icon={FileQuestion}
          title="Consignment not found"
          description="That link does not point at a consignment."
          action={
            <Button asChild>
              <Link href="/consignments/admin">Back to consignments</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <RequirePermission anyOf={CONSIGNMENT_ADMIN_PERMISSIONS.view}>
      <ConsignmentDetailView id={consignmentId} />
    </RequirePermission>
  );
}
