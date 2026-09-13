"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, MapPin, Package, PackageCheck } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDate, formatDateTime } from "@/shared/lib/dates";

import {
  ConsignmentStatusBadge,
  PickupStatusBadge,
} from "../../_components/pickup-badges";
import {
  addressLines,
  consignmentCount,
  formatDeclared,
  formatTime,
  formatWeight,
  humanize,
  isCancelled,
  partyName,
  pickupConsignments,
  place,
  vehicleLabel,
  type PickupConsignment,
  type PickupRequest,
} from "../../types";

/**
 * One pickup request, in full.
 *
 * Laid out the way the ticket and approval detail pages are — the state worth
 * acting on first, then an overview grid, then the free text — so someone
 * moving between these screens does not have to relearn where things live.
 *
 * Read-only by design: no cancel or reschedule endpoint was published, and
 * `next_statuses` comes back empty, so this reports the workflow rather than
 * driving it.
 */

/** One label/value pair. `min-w-0` so a long value shrinks instead of pushing the grid. */
function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

export function PickupDetail({ pickup }: { pickup: PickupRequest }) {
  const time = formatTime(pickup.pickup_time);
  const boxes = Number(pickup.total_boxes ?? 0);
  const weight = Number(pickup.total_weight ?? 0);
  const count = consignmentCount(pickup);
  const rows = pickupConsignments(pickup);
  const cancelled = isCancelled(pickup);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <span className="text-base font-semibold text-foreground">
            {pickup.pickup_no || `#${pickup.id}`}
          </span>
          <PickupStatusBadge pickup={pickup} />
        </CardContent>
      </Card>

      {/* A cancelled pickup is not a record to read top to bottom — it is one
          fact and a reason, and both belong above everything else. */}
      {cancelled ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">
            Cancelled{pickup.cancelled_at ? ` on ${formatDateTime(pickup.cancelled_at)}` : ""}
          </p>
          {pickup.cancellation_reason?.trim() ? (
            <p className="mt-1 whitespace-pre-line">
              {pickup.cancellation_reason}
            </p>
          ) : null}
        </div>
      ) : null}

      <Section title="Collection">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Pickup date" value={formatDate(pickup.pickup_date)} />
          {/* A booking with no time is normal — the van comes when it comes. */}
          <Field
            label="Pickup time"
            value={time || <span className="text-muted-foreground">Any time</span>}
          />
          <Field label="Vehicle" value={vehicleLabel(pickup.vehicle_type)} />

          <Field
            label="Consignment requests"
            value={`${count} request${count === 1 ? "" : "s"}`}
          />
          <Field label="Boxes" value={`${boxes}`} />
          {/* Zero is a real answer here: a van booked before anything is packed
              reports no weight, which is different from not knowing. */}
          <Field
            label="Total weight"
            value={Number.isFinite(weight) ? `${weight} kg` : "—"}
          />
        </div>
      </Section>

      {/*
        The rows, not just the number.

        The detail response nests the whole consignment request — tracking id,
        route, status — which is the difference between "3 requests" and being
        able to check that the right three are on the van. Only what identifies
        a shipment is shown; the rest of each row belongs to its own page, which
        the tracking id links to.
      */}
      <Section title={`On this pickup · ${count}`}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {count > 0
              ? `${count} consignment request${count === 1 ? "" : "s"}, not listed on this response.`
              : "No consignment requests are attached to this pickup."}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              // One consignment on a pickup is the common case, and collapsing
              // the only thing on the page just adds a click.
              <ConsignmentRow key={row.id} row={row} soleRow={rows.length === 1} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Progress">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Requested" value={formatDateTime(pickup.created_at)} />
          <Field
            label="Assigned"
            value={
              pickup.assigned_at || pickup.assigned_to ? (
                <>
                  {pickup.assigned_to?.trim() ||
                    (pickup.assigned_to_id ? `#${pickup.assigned_to_id}` : "—")}
                  {pickup.assigned_at ? (
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(pickup.assigned_at)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-muted-foreground">
                  No driver assigned yet
                </span>
              )
            }
          />
          <Field label="Last updated" value={formatDateTime(pickup.updated_at)} />
        </div>
      </Section>

      <Section title="Remarks">
        {/* `whitespace-pre-line`: remarks are typed by a person and their line
            breaks carry meaning — this is where gate codes and phone numbers
            end up. */}
        <p className="whitespace-pre-line break-words text-sm text-foreground">
          {pickup.remarks?.trim() || (
            <span className="text-muted-foreground">
              Nothing noted for the driver.
            </span>
          )}
        </p>
      </Section>
    </div>
  );
}

/** One label/value pair inside a consignment row. Blank values are dropped by the caller. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
    </div>
  );
}

/** An address block — who, where, and how to reach them. */
function Party({
  title,
  icon: Icon,
  name,
  lines,
  phone,
  email,
}: {
  title: string;
  icon: typeof MapPin;
  name: string;
  lines: string[];
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-secondary/30 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden className="size-3" />
        {title}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{name}</p>
      {lines.length > 0 ? (
        <p className="mt-0.5 break-words text-xs text-muted-foreground">
          {lines.join(", ")}
        </p>
      ) : null}
      {/* A phone number on a collection screen is the thing that saves the
          trip when nobody answers the door. */}
      {phone?.trim() ? (
        <a
          href={`tel:${phone.trim()}`}
          className="mt-1 block text-xs font-medium text-primary hover:underline"
        >
          {phone.trim()}
        </a>
      ) : null}
      {email?.trim() ? (
        <p className="text-xs text-muted-foreground">{email.trim()}</p>
      ) : null}
    </div>
  );
}

/**
 * One consignment request on the pickup.
 *
 * Two layers on purpose. The header and the two address blocks are what the
 * collection itself needs — where the van goes, who to ask for, what to expect
 * — and stay on screen. Everything the record also carries (routing codes,
 * declared value, goods, the delivery-side dates) sits behind "Full details",
 * because a pickup with six consignments would otherwise be six screens of
 * fields nobody is reading today.
 */
function ConsignmentRow({
  row,
  soleRow,
}: {
  row: PickupConsignment;
  soleRow?: boolean;
}) {
  const [open, setOpen] = React.useState(Boolean(soleRow));

  const sender = row.sender ?? {};
  const receiver = row.receiver ?? {};

  const boxes = row.no_of_boxes ?? null;
  const weight =
    formatWeight(row.actual_total_weight) ?? formatWeight(row.total_weight);

  /* Only the facts this record actually carries — an empty grid of dashes
     says nothing and costs a screen. */
  const facts: { label: string; value: React.ReactNode }[] = [];
  const push = (label: string, value?: string | null) => {
    const text = String(value ?? "").trim();
    if (text) facts.push({ label, value: text });
  };

  push("Service", row.service_code);
  push("Via", row.via_code);
  push("Integrator", row.integrator_code);
  push("Agent", row.agent_code);
  push("Product type", row.product_type);
  push("Mode", row.mode_of_transport);
  push("Goods", row.consignment_goods_desc);
  push("Nature of goods", row.nature_of_goods);
  push("HS code", row.consignment_hs_code);

  if (row.declared_value !== null && row.declared_value !== undefined) {
    facts.push({
      label: "Declared value",
      value: formatDeclared(row.declared_value, row.declared_currency),
    });
  }

  push("Shipper reference", row.shipper_reference_code);
  if (row.total_volumetric_weight) {
    push("Volumetric weight", formatWeight(row.total_volumetric_weight));
  }
  if (row.ship_date) push("Ship date", formatDate(row.ship_date));
  if (row.pickup_time) push("Pickup time", formatDateTime(row.pickup_time));
  if (row.picked_up_at) push("Picked up", formatDateTime(row.picked_up_at));
  if (row.preferred_delivery_time) {
    push("Preferred delivery", formatDateTime(row.preferred_delivery_time));
  }

  const urgency = row.urgency?.trim();

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/consignments/request/${row.id}`}
          className="truncate font-medium text-foreground hover:text-primary hover:underline"
        >
          {row.request_tracking_id?.trim() || `#${row.id}`}
        </Link>
        <ConsignmentStatusBadge status={row.status} label={row.status_label} />
        {/* Urgency changes how a collection is handled, so it rides at the top
            rather than sitting in the details. */}
        {urgency ? (
          <Badge
            variant={
              /URGENT|HIGH|EXPRESS|PRIORITY/i.test(urgency)
                ? "destructive"
                : "secondary"
            }
          >
            {humanize(urgency)}
          </Badge>
        ) : null}

        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {row.package_type?.trim() ? (
            <span className="inline-flex items-center gap-1">
              <Package aria-hidden className="size-3" />
              {row.package_type.trim()}
            </span>
          ) : null}
          {/* `no_of_boxes` is null until the boxes are declared, which is not
              the same as zero boxes. */}
          {boxes !== null ? <span>{boxes} box{boxes === 1 ? "" : "es"}</span> : null}
          {weight ? <span>{weight}</span> : null}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Party
          title="Collect from"
          icon={MapPin}
          name={partyName(
            sender.sender_first_name,
            sender.sender_last_name,
            sender.sender_company,
          )}
          lines={addressLines([
            sender.sender_address_1,
            sender.sender_address_2,
            place(sender.sender_city, sender.sender_country),
            sender.sender_zip,
          ])}
          phone={sender.sender_phone}
          email={sender.sender_email}
        />

        <Party
          title="Deliver to"
          icon={PackageCheck}
          name={partyName(
            receiver.receiver_first_name,
            receiver.receiver_last_name,
            receiver.receiver_company,
          )}
          lines={addressLines([
            place(receiver.receiver_city, receiver.receiver_country),
            receiver.receiver_zip,
          ])}
          phone={receiver.receiver_phone}
        />
      </div>

      {/* Written for whoever is collecting, so it stays outside the fold. */}
      {row.pickup_note?.trim() ? (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {row.pickup_note.trim()}
        </p>
      ) : null}

      {facts.length > 0 || row.delivery_note?.trim() ? (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ChevronDown
              aria-hidden
              className={cn("size-3.5 transition-transform", open && "rotate-180")}
            />
            {open ? "Hide details" : "Full details"}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 sm:grid-cols-3 lg:grid-cols-4">
              {facts.map((fact) => (
                <Fact key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>

            {row.delivery_note?.trim() ? (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Delivery note:{" "}
                </span>
                {row.delivery_note.trim()}
              </p>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </li>
  );
}

/** The same rhythm with the values blanked, so the page does not jump. */
export function PickupDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </CardContent>
      </Card>

      {Array.from({ length: 2 }).map((_, section) => (
        <Card key={section}>
          <CardContent className="p-5">
            <Skeleton className="mb-4 h-4 w-28" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((__, field) => (
                <div key={field} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
