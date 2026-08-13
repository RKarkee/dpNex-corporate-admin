"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { CONSIGNMENT_PERMISSIONS } from "../../permissions";
import { ConsignmentForm } from "../../_components/consignment-form";
import { RequestLoadError } from "../../_components/request-load-error";
import { consignmentRequestKeys } from "../../_hooks/query-keys";
import { useConsignmentRequest } from "../../_hooks/use-consignment-request";
import { useUpdateConsignmentRequest } from "../../_hooks/use-save-consignment-request";
import { mapDetailToFormValues, resolveLookupLabels } from "../../mappers";

/**
 * Edit an existing consignment request.
 *
 * Two async steps stand between the record and the form: mapping it into form
 * shape, and resolving every stored lookup code (HS codes, currencies,
 * materials, manufacturers) to the name its combobox has to display. The
 * second needs network calls, so it is its own query rather than an effect —
 * that way it is cached, cancelled on unmount, and the form is only mounted
 * once its `defaultValues` are final.
 *
 * Mounting the form early and calling `reset()` later would work too, but it
 * would flash the raw codes before the names arrived, and reset is exactly
 * what discards anything the user had already typed.
 */
export default function EditConsignmentRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const requestId = Number(id);
  const valid = Number.isFinite(requestId);

  const detail = useConsignmentRequest(valid ? requestId : 0);
  const updateRequest = useUpdateConsignmentRequest();

  const record = detail.data;

  const formValues = useQuery({
    queryKey: consignmentRequestKeys.formValues(requestId),
    queryFn: () =>
      resolveLookupLabels(
        // Guarded by `enabled` — the query cannot run before the record lands.
        mapDetailToFormValues(record!.request, record!.boxes),
      ),
    enabled: Boolean(record),

    // Stable while the page is open: the label lookups are slow, and refetching
    // would rebuild `defaultValues` underneath someone mid-edit.
    staleTime: Infinity,
    refetchOnWindowFocus: false,

    // ...but discarded the moment the page unmounts. Without this, editing a
    // request, adding a box to it from the detail page, then coming back here
    // would re-seed the form from the *cached mapping of the old record* — the
    // new box simply missing. `staleTime: Infinity` and a live cache entry are
    // only safe together for data that cannot change; this can.
    gcTime: 0,
  });

  // A non-numeric id can never resolve; a load failure is either a missing
  // record or a transient fault, and `RequestLoadError` tells them apart.
  if (!valid || (detail.isError && !detail.data)) {
    return (
      <>
        <PageHeader title="Edit consignment request" />
        <RequestLoadError
          error={valid ? detail.error : new Error("Invalid request id")}
          onRetry={valid ? () => void detail.refetch() : undefined}
        />
      </>
    );
  }

  return (
    <RequirePermission anyOf={CONSIGNMENT_PERMISSIONS.update}>
      <PageHeader
        title="Edit consignment request"
        description={
          record?.request.request_tracking_id ??
          "Update the sender, receiver and contents."
        }
        actions={
          <Button variant="outline" asChild>
            <Link href={`/consignments/request/${requestId}`}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />

      {formValues.data && record ? (
        <ConsignmentForm
          // Remounted per record: `defaultValues` is only read on mount, so a
          // record that arrives after the first render would never be applied.
          key={requestId}
          defaultValues={formValues.data}
          onSubmit={(values) =>
            updateRequest.mutate({
              id: requestId,
              values,
              detail: record.request,
            })
          }
          submitting={updateRequest.isPending}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          cancelHref={`/consignments/request/${requestId}`}
          error={updateRequest.error}
        />
      ) : (
        <EditFormSkeleton />
      )}
    </RequirePermission>
  );
}

function EditFormSkeleton() {
  return (
    <div className="space-y-6">
      {[3, 2, 2].map((rows, card) => (
        <Card key={card} className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2 border-b border-border/70 pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: rows * 3 }).map((_, field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
