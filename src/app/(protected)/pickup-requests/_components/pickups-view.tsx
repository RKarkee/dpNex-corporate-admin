"use client";

import * as React from "react";
import { Truck, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";

import { usePickupRequests } from "../_hooks/use-pickup-requests";
import { NewPickupButton } from "./new-pickup-button";
import { PickupsTable, PickupsTableSkeleton } from "./pickups-table";

/**
 * The pickup list: table, pagination, and the states it can be in.
 *
 * Page is local state rather than a URL param, unlike the approval and ticket
 * lists. Those have filters worth sharing a link to; this endpoint publishes no
 * filters at all, so a query string would be page number and nothing else —
 * parsing and clamping for no benefit. Move it to the URL the day filters
 * arrive.
 */
export function PickupsView() {
  const [page, setPage] = React.useState(1);

  const { data, isPending, isError, error, isFetching, refetch } =
    usePickupRequests(page);

  const items = data?.items ?? [];

  if (isPending) return <PickupsTableSkeleton />;

  if (isError) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Could not load pickup requests
        </h3>
        {/* `ApiError.message` is already sanitised; a raw upstream body would
            leak stack traces at 5xx. */}
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {isApiError(error)
            ? error.message
            : "Something went wrong. Please try again."}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No pickups requested yet"
        description="Book a van for consignments that are ready to collect, and the request will appear here with its status."
        action={<NewPickupButton />}
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Dimmed rather than swapped for a skeleton: on a page change the old
            rows are still meaningful, and replacing them makes the page
            flicker. */}
        <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
          <PickupsTable pickups={items} />
        </div>

        <div className="border-t border-border px-4">
          <Pagination
            meta={data.meta}
            onPageChange={setPage}
            disabled={isFetching}
          />
        </div>
      </CardContent>
    </Card>
  );
}
