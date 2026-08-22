"use client";

import * as React from "react";
import { Eye, MapPin, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { Pagination } from "@/shared/components/ui/pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

import { useConsignmentRequest } from "../../../../_hooks/use-consignment-request";
import { useConsignmentPermissions } from "../../../../_hooks/use-consignment-permissions";
import {
  useConsignmentLocations,
  useDeleteConsignmentLocation,
} from "../_hooks/use-consignment-locations";
import { locationPlace, shortDateTime, type ConsignmentLocation } from "../types";
import { LocationFormDialog } from "./location-form-dialog";
import { LocationViewDialog, statusLabel } from "./location-view-dialog";

/**
 * The Locations tab: the tracking scans on one consignment request.
 *
 * A table rather than the card grid the Documents tab uses — a location is a
 * row of short, comparable values (place, status, arrived, moved), and reading
 * them down a column is how a user checks a shipment's progress.
 *
 * The status select in the form is driven by the parent request's
 * `next_statuses`, read from the record the shell has already loaded, so the
 * options can never drift from the workflow the backend enforces.
 */

const PER_PAGE = 10;

/**
 * The action column stays reachable while the rest of the row scrolls under it.
 *
 * Only below `sm` — above that every column fits and pinning is just a border
 * that earns nothing. Matches `users-table.tsx`, so the two behave the same.
 */
const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

export function LocationsTab({ id }: { id: number }) {
  const requestId = String(id);

  const [page, setPage] = React.useState(1);
  const [viewing, setViewing] = React.useState<ConsignmentLocation | null>(null);
  const [editing, setEditing] = React.useState<ConsignmentLocation | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentLocation | null>(null);

  const request = useConsignmentRequest(id);
  const { canUpdate } = useConsignmentPermissions();
  const query = useConsignmentLocations(requestId, page, PER_PAGE);
  const deleteLocation = useDeleteConsignmentLocation(requestId);

  const rows = React.useMemo(() => query.data?.items ?? [], [query.data]);
  const statuses = React.useMemo(
    () => request.data?.request.next_statuses ?? [],
    [request.data],
  );

  if (query.isLoading) return <LocationsTabSkeleton />;

  if (query.isError) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Could not load locations
        </h3>
        {/* `ApiError.message` is already sanitised; a raw upstream body would
            leak stack traces at 5xx. */}
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {isApiError(query.error)
            ? query.error.message
            : "Something went wrong. Please try again."}
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => void query.refetch()}
        >
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold text-foreground">Locations</h3>
          <p className="text-sm text-muted-foreground">
            Where this shipment has been, and the status each scan moved it to
          </p>
        </div>
        {canUpdate ? (
          <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Add Location
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations recorded"
          description="Pickup, transit and delivery scans for this request will appear here."
          action={
            canUpdate ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden />
                Add Location
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Dimmed rather than replaced while the next page loads, so the
              table does not collapse and rebuild under the user. */}
          <div
            className={cn(
              "overflow-x-auto",
              query.isFetching && "opacity-60 transition-opacity",
            )}
          >
            <Table>
              <TableHeader>
                {/* Columns drop as the viewport narrows, widest-value first.
                    Everything dropped is re-surfaced under Location below, so
                    narrowing hides the grid, never the data. */}
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="hidden md:table-cell">Place</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Arrived</TableHead>
                  <TableHead className="hidden lg:table-cell">Moved</TableHead>
                  <TableHead className={cn("text-right", STICKY_ACTIONS)}>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-44 max-w-64 font-medium text-foreground">
                      <span className="block truncate">
                        {row.location || "—"}
                      </span>

                      {row.forwarder_code ? (
                        <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                          via {row.forwarder_code}
                          {row.new_tracking_no ? ` · ${row.new_tracking_no}` : ""}
                        </span>
                      ) : null}

                      {/* Carries the dropped columns on small screens. */}
                      <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground md:hidden">
                        {locationPlace(row)}
                      </span>

                      <span className="mt-1 block text-xs font-normal text-muted-foreground lg:hidden">
                        {shortDateTime(row.arrived_at)}
                        {row.moved_at ? ` → ${shortDateTime(row.moved_at)}` : ""}
                      </span>

                      <span className="mt-1.5 block sm:hidden">
                        <Badge variant="secondary" className="font-medium">
                          {statusLabel(row.status, statuses)}
                        </Badge>
                      </span>
                    </TableCell>

                    <TableCell className="hidden max-w-48 truncate text-muted-foreground md:table-cell">
                      {locationPlace(row)}
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      {/* `whitespace-normal`: labels run to "Modification
                          required by corporate", and a nowrap badge would force
                          the column far wider than the rest of the row. */}
                      <Badge
                        variant="secondary"
                        className="max-w-40 whitespace-normal text-left font-medium leading-snug"
                      >
                        {statusLabel(row.status, statuses)}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {shortDateTime(row.arrived_at)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {shortDateTime(row.moved_at)}
                    </TableCell>
                    <TableCell className={STICKY_ACTIONS}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewing(row)}
                          className="size-7 text-muted-foreground hover:text-primary"
                        >
                          <Eye className="size-3.5" aria-hidden />
                          <span className="sr-only">View this location</span>
                        </Button>
                        {canUpdate ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(row)}
                              className="size-7 text-muted-foreground hover:text-primary"
                            >
                              <Pencil className="size-3.5" aria-hidden />
                              <span className="sr-only">Edit this location</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(row)}
                              className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              <span className="sr-only">
                                Delete this location
                              </span>
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            meta={query.data?.meta}
            onPageChange={setPage}
            disabled={query.isFetching}
            className="px-4"
          />
        </Card>
      )}

      <LocationViewDialog
        requestId={requestId}
        location={viewing}
        statuses={statuses}
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      {/* Create and edit are the same dialog; `location` being null is what
          puts it in create mode. Two mounts rather than one so opening the
          editor never inherits a half-filled create form. */}
      <LocationFormDialog
        requestId={requestId}
        location={null}
        statuses={statuses}
        open={creating}
        onOpenChange={setCreating}
      />

      <LocationFormDialog
        requestId={requestId}
        location={editing}
        statuses={statuses}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this location?"
        description={
          pendingDelete
            ? `${pendingDelete.location || "This scan"} · ${locationPlace(pendingDelete)}. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteLocation.mutateAsync(pendingDelete.id);
          setPendingDelete(null);

          // Deleting the only row on the last page would otherwise strand the
          // user on a page that no longer exists.
          if (rows.length === 1 && page > 1) setPage((current) => current - 1);
        }}
      />
    </div>
  );
}

export function LocationsTabSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </Card>
  );
}
