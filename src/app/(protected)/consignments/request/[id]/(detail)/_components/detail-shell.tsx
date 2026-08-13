"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FileQuestion, Pencil } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { useConsignmentPermissions } from "../../../_hooks/use-consignment-permissions";
import { useConsignmentRequest } from "../../../_hooks/use-consignment-request";
import { RequestLoadError } from "../../../_components/request-load-error";
import { DetailTabs } from "./detail-tabs";

/**
 * The frame every tab on the detail page sits inside: title, actions, tabs.
 *
 * Lives in the layout, so switching tabs swaps only the panel — the header does
 * not flicker and the record is not refetched.
 *
 * It also owns the three states that are the *page's*, not a tab's: an id that
 * cannot resolve, the record still loading, and a load failure. A tab is only
 * mounted once there is a record to render, which is why each tab can call
 * `useConsignmentRequest` and assume data — React Query serves it from cache,
 * so that second call costs nothing.
 *
 * The Edit button belongs here rather than in a tab: editing is a separate
 * page, not a section of this one.
 */
export function DetailShell({
  id,
  children,
}: {
  /** Raw from the URL — validated here so no tab has to. */
  id: string;
  children: React.ReactNode;
}) {
  const requestId = Number(id);
  const valid = Number.isFinite(requestId) && requestId > 0;

  const { data, isPending, isError, error, refetch } = useConsignmentRequest(
    valid ? requestId : 0,
  );
  const { canUpdate } = useConsignmentPermissions();

  if (!valid) {
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

  if (isPending) return <DetailShellSkeleton />;

  if (isError || !data) {
    return (
      <>
        <PageHeader title="Consignment request" />
        <RequestLoadError error={error} onRetry={() => void refetch()} />
      </>
    );
  }

  const { request } = data;

  return (
    <>
      <PageHeader
        title={request.request_tracking_id || `Request #${request.id}`}
        description="Everything submitted with this consignment request."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/consignments/request">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            {canUpdate ? (
              <Button asChild>
                <Link href={`/consignments/request/${requestId}/edit`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <DetailTabs id={requestId} />

      {children}
    </>
  );
}

/** Header and tab bar blanked out, so the page does not jump when data lands. */
function DetailShellSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="mb-6 flex gap-6 border-b border-border pb-3">
        {[20, 24, 22].map((width, tab) => (
          <Skeleton key={tab} className="h-5" style={{ width: `${width * 4}px` }} />
        ))}
      </div>

      <div className="space-y-6">
        {[4, 4, 8].map((fields, card) => (
          <Card key={card} className="space-y-4 p-6">
            <Skeleton className="h-5 w-32" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: fields }).map((_, field) => (
                <div key={field} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
