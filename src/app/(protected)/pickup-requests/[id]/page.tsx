"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { usePickupRequest } from "../_hooks/use-pickup-request";
import {
  PickupDetail,
  PickupDetailSkeleton,
} from "./_components/pickup-detail";
import { PickupNotFound } from "./_components/pickup-not-found";

export default function PickupRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  const query = usePickupRequest(id);
  const pickup = query.data;

  if (query.isError && !pickup) return <PickupNotFound />;

  return (
    <>
      <PageHeader
        title={pickup?.pickup_no ?? "Pickup request"}
        description="When the van is coming, what it is collecting, and where the request has got to."
        actions={
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/pickup-requests">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />

      {query.isPending || !pickup ? (
        <PickupDetailSkeleton />
      ) : (
        <PickupDetail pickup={pickup} />
      )}
    </>
  );
}
