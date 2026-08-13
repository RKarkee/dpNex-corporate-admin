"use client";

import * as React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { CONSIGNMENT_PERMISSIONS } from "../permissions";
import { RequestDetail } from "../_components/request-detail";

export default function ConsignmentRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const requestId = Number(id);

  // A non-numeric id can never resolve, so it is answered here rather than
  // spent on a request that is certain to 404.
  if (!Number.isFinite(requestId)) {
    return (
      <>
        <PageHeader title="Consignment request" />
        <EmptyState
          icon={FileQuestion}
          title="Request not found"
          description="That link does not point at a consignment request."
          action={
            <Button asChild>
              <Link href="/consignments/request">Back to requests</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <RequirePermission anyOf={CONSIGNMENT_PERMISSIONS.view}>
      <RequestDetail id={requestId} />
    </RequirePermission>
  );
}
