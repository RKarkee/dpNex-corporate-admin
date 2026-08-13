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

import { ConsignmentForm } from "../../_components/consignment-form";
import { ConsignmentLoadError } from "../../_components/consignment-load-error";
import { consignmentAdminKeys } from "../../_hooks/query-keys";
import { useConsignment } from "../../_hooks/use-consignments";
import { useUpdateConsignment } from "../../_hooks/use-save-consignment";
import { mapDetailToFormValues, resolveLookupLabels } from "../../mappers";
import { CONSIGNMENT_ADMIN_PERMISSIONS } from "../../permissions";

/**
 * Edit an existing consignment.
 *
 * Two async steps stand between the record and the form: mapping it into form
 * shape, and resolving every stored lookup code (HS codes, currencies,
 * materials, manufacturers) to the name its combobox has to display. The second
 * needs network calls, so it is its own query rather than an effect — that way
 * it is cancelled on unmount, and the form is only mounted once its
 * `defaultValues` are final.
 *
 * Mounting the form early and calling `reset()` later would work too, but it
 * would flash the raw codes before the names arrived, and reset is exactly what
 * discards anything the user had already typed.
 */
export default function EditConsignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const consignmentId = Number(id);
  const valid = Number.isFinite(consignmentId);

  const detail = useConsignment(valid ? consignmentId : 0);
  const updateConsignment = useUpdateConsignment();

  const record = detail.data;

  const formValues = useQuery({
    queryKey: consignmentAdminKeys.formValues(consignmentId),
    queryFn: () =>
      resolveLookupLabels(
        // Guarded by `enabled` — the query cannot run before the record lands.
        mapDetailToFormValues(record!.consignment, record!.boxes),
      ),
    enabled: Boolean(record),

    // Stable while the page is open: the label lookups are slow, and refetching
    // would rebuild `defaultValues` underneath someone mid-edit.
    staleTime: Infinity,
    refetchOnWindowFocus: false,

    // ...but discarded the moment the page unmounts. Without this, editing a
    // consignment, adding a box from the detail page, then coming back here
    // would re-seed the form from the *cached mapping of the old record* — the
    // new box simply missing. `staleTime: Infinity` and a live cache entry are
    // only safe together for data that cannot change; this can.
    gcTime: 0,
  });

  // A non-numeric id can never resolve; a load failure is either a missing
  // record or a transient fault, and `ConsignmentLoadError` tells them apart.
  if (!valid || (detail.isError && !detail.data)) {
    return (
      <>
        <PageHeader title="Edit consignment" />
        <ConsignmentLoadError
          error={valid ? detail.error : new Error("Invalid consignment id")}
          onRetry={valid ? () => void detail.refetch() : undefined}
        />
      </>
    );
  }

  return (
    <RequirePermission anyOf={CONSIGNMENT_ADMIN_PERMISSIONS.update}>
      <PageHeader
        title="Edit consignment"
        description={
          record?.consignment.request_tracking_id ??
          record?.consignment.tracking_number ??
          "Update the sender, receiver and contents."
        }
        actions={
          <Button variant="outline" asChild>
            <Link href={`/consignments/admin/${consignmentId}`}>
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
          key={consignmentId}
          defaultValues={formValues.data}
          onSubmit={(values) =>
            updateConsignment.mutate({
              id: consignmentId,
              values,
              detail: record.consignment,
            })
          }
          submitting={updateConsignment.isPending}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          cancelHref={`/consignments/admin/${consignmentId}`}
          error={updateConsignment.error}
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
