"use client";

import { Box, MapPin, Truck, User, type LucideIcon } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDate, formatDateTime } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";

import { usePlaceNames } from "../../_hooks/use-place-names";
import { humanize, joinPlace } from "../../lib/format";
import type { TrackedLocation, TrackedParty, TrackResult } from "../../types";
import { InfoItem } from "../info-item";

/**
 * Everything the API is willing to say about a shipment: a summary with the
 * latest status, sender and receiver, and the movement history as a
 * timeline. Blocks the API withholds are simply absent.
 */
export function TrackResultView({ result }: { result: TrackResult }) {
  const { consignment, sender, receiver, locations } = result;
  const latest = locations[0] ?? null;
  const latestPlace = usePlaceNames(latest?.country, latest?.state);

  return (
    <div className="space-y-4 sm:space-y-6">
      {consignment || latest ? (
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-foreground">
                <Box className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Shipment</p>
                <p className="break-all text-lg font-semibold text-foreground">
                  {consignment?.trackingNo ?? consignment?.hawb ?? "—"}
                </p>
              </div>
            </div>
            {latest ? <StatusBadge status={latest.status} /> : null}
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Tracking no." value={consignment?.trackingNo} />
            <InfoItem label="HAWB" value={consignment?.hawb} />
            <InfoItem
              label="Ship date"
              value={consignment?.shipDate ? formatDate(consignment.shipDate) : null}
            />
            <InfoItem
              label="Last known location"
              value={latest ? joinPlace(latest.location, latest.city, latestPlace.country) : null}
            />
          </dl>
        </Card>
      ) : null}

      {sender || receiver ? (
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          {sender ? <PartyCard title="Sender" icon={User} party={sender} /> : null}
          {receiver ? <PartyCard title="Receiver" icon={Truck} party={receiver} /> : null}
        </div>
      ) : null}

      <Card className="p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="size-4" aria-hidden />
          Tracking history
        </h3>
        {locations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No movement has been recorded for this shipment yet.
          </p>
        ) : (
          <ol className="mt-5">
            {locations.map((item, index) => (
              <TimelineItem
                key={`${item.arrived_at ?? item.moved_at ?? "x"}-${index}`}
                item={item}
                first={index === 0}
                last={index === locations.length - 1}
              />
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function PartyCard({ title, icon: Icon, party }: { title: string; icon: LucideIcon; party: TrackedParty }) {
  const place = usePlaceNames(party.country, party.state);

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4" aria-hidden />
        {title}
      </h3>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoItem label="Name" value={party.name} />
        <InfoItem label="Company" value={party.company} />
        <InfoItem label="Address" value={party.address} className="sm:col-span-2" />
        <InfoItem label="City" value={party.city} />
        <InfoItem label="State" value={place.state} />
        <InfoItem label="Country" value={place.country} />
        <InfoItem label="ZIP" value={party.zip} />
      </dl>
    </Card>
  );
}

function TimelineItem({ item, first, last }: { item: TrackedLocation; first: boolean; last: boolean }) {
  const names = usePlaceNames(item.country, item.state);
  const place = joinPlace(item.city, names.state, names.country);
  const when = formatDateTime(item.arrived_at ?? item.moved_at);

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last ? <span className="absolute left-[7px] top-4 h-full w-px bg-border" aria-hidden /> : null}
      <span
        className={cn(
          "relative mt-1 size-4 shrink-0 rounded-full border-2",
          first ? "border-primary bg-primary" : "border-border bg-background",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={item.status} />
          <span className="text-xs text-muted-foreground">{when}</span>
        </div>
        <p className="text-sm font-medium text-foreground">{item.location || place || "—"}</p>
        {item.location && place ? <p className="text-xs text-muted-foreground">{place}</p> : null}
        {item.comments ? <p className="text-sm text-muted-foreground">{item.comments}</p> : null}
        {item.moved_at && item.arrived_at ? (
          <p className="text-xs text-muted-foreground">Departed {formatDateTime(item.moved_at)}</p>
        ) : null}
      </div>
    </li>
  );
}

/** A status such as `APPROVED_BY_CORPORATE` as a neutral badge. */
function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant="secondary">{humanize(status)}</Badge>;
}

export function TrackResultSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
