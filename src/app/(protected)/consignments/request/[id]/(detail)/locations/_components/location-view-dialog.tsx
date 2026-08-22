"use client";

import { MapPin } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";

import type { NextStatusOption } from "../../../../types";
import { useConsignmentLocation } from "../_hooks/use-consignment-locations";
import { shortDateTime, type ConsignmentLocation } from "../types";

/**
 * One location, read-only.
 *
 * Re-reads the record on open rather than trusting the list row — the list is
 * paginated and may be a page behind a status another user has since moved.
 */
export function LocationViewDialog({
  requestId,
  location: row,
  statuses,
  open,
  onOpenChange,
}: {
  requestId: string;
  location: ConsignmentLocation | null;
  /** Used to turn a stored status code into the API's own label. */
  statuses: NextStatusOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useConsignmentLocation(requestId, row?.id, row ?? undefined);
  const doc = (detail.data as ConsignmentLocation | undefined) ?? row;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" aria-hidden />
            Location details
          </DialogTitle>
          <DialogDescription>{doc?.location ?? null}</DialogDescription>
        </DialogHeader>

        {doc ? (
          <div className="space-y-5">
            <Badge variant="secondary" className="font-medium">
              {statusLabel(doc.status, statuses)}
            </Badge>

            {/* One column on a phone: these values (a place name, a full
                timestamp) do not survive being halved. */}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Location" value={doc.location} />
              <Detail label="Country" value={doc.country} />
              <Detail label="State" value={doc.state} />
              <Detail label="City" value={doc.city} />
              <Detail
                label="Scan date"
                value={doc.location_date?.slice(0, 10)}
              />
              <Detail label="Arrived at" value={shortDateTime(doc.arrived_at)} />
              <Detail label="Moved at" value={shortDateTime(doc.moved_at)} />
              <Detail label="Forwarder" value={doc.forwarder_code} />
              <Detail
                label="Forwarder tracking no."
                value={doc.new_tracking_no}
              />
              <div className="sm:col-span-2">
                <Detail
                  label="Comments"
                  value={doc.comments}
                  className="whitespace-pre-line"
                />
              </div>
            </dl>

            <p className="text-xs text-muted-foreground">
              Recorded {shortDateTime(doc.created_at)}
              {doc.updated_at && doc.updated_at !== doc.created_at
                ? ` · last changed ${shortDateTime(doc.updated_at)}`
                : null}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The API's own label for a status, falling back to the raw code.
 *
 * `next_statuses` only lists where the record may go *next*, so a status it has
 * already passed through will not be in it — showing the code is then the
 * honest answer rather than a blank.
 */
export function statusLabel(
  status: string,
  statuses: NextStatusOption[],
): string {
  return statuses.find((option) => option.value === status)?.label ?? status;
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-sm text-foreground ${className ?? ""}`}>
        {value?.trim() || "—"}
      </dd>
    </div>
  );
}
