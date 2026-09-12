"use client";

import Link from "next/link";
import { Clock, Package, UserX } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useLookupLabel } from "@/shared/hooks/use-lookup-label";
import { useMounted } from "@/shared/hooks/use-mounted";
import { formatDateTime } from "@/shared/lib/dates";

import {
  humanize,
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "../../_components/ticket-badges";
import { relativeAge } from "../../lib/ticket-replies";
import {
  isAwaitingFirstResponse,
  isUnassigned,
  type SupportTicket,
} from "../../types";
import { TicketThread } from "./ticket-thread";

/**
 * One support ticket, in full.
 *
 * Laid out like the admin console's detail screen, because the two are read by
 * people talking to each other about the same record and a field that lives in
 * a different place on each side is a field they will describe differently:
 * the two states worth acting on first, then an overview grid, then what was
 * reported, the resolution if there is one, and the conversation.
 *
 * What the console has and this does not is the half that belongs to staff —
 * assignment and the workflow events. This side reports them; it does not
 * drive them.
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

export function TicketDetail({ ticket }: { ticket: SupportTicket }) {
  /*
   * The API sends `raised_by_name` and `assigned_to_name` as null even when the
   * ids are set, so both are resolved through the same lookups the filter bar
   * uses. One record, two cached requests — cheap here, which is why the table
   * settles for "Assigned" instead.
   */
  const raisedById = ticket.raised_by ? String(ticket.raised_by) : "";
  const assignedToId = ticket.assigned_to ? String(ticket.assigned_to) : "";

  const raisedByLookup = useLookupLabel("corporateUser", raisedById);
  const assignedToLookup = useLookupLabel("assignable", assignedToId);

  /** The lookup falls back to the id itself, which reads better as `#27`. */
  const name = (
    stored: string | null | undefined,
    id: string,
    resolved: string,
  ) => {
    const given = stored?.trim();
    if (given) return given;
    if (!id) return null;
    return resolved && resolved !== id ? resolved : `#${id}`;
  };

  const raisedBy = name(ticket.raised_by_name, raisedById, raisedByLookup);
  const assignedTo = name(
    ticket.assigned_to_name,
    assignedToId,
    assignedToLookup,
  );

  /* "3h ago" depends on the current time, so it renders only after mount — the
     server and the browser would compute different strings and React would
     throw the subtree away. */
  const mounted = useMounted();
  const openedAge = mounted ? relativeAge(ticket.created_at) : "";

  const unassigned = isUnassigned(ticket);
  const awaiting = isAwaitingFirstResponse(ticket);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <span className="text-base font-semibold text-foreground">
            {ticket.ticket_no || `#${ticket.id}`}
          </span>
          <TicketStatusBadge ticket={ticket} />
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketCategoryBadge category={ticket.category} />
        </CardContent>
      </Card>

      {/*
        The two states that make a ticket a problem rather than a record, above
        everything else — this page is where someone decides whether to chase
        it. Both clear themselves: the server owns `assigned_to` and
        `first_responded_at`, and every write here refetches.
      */}
      {unassigned || awaiting ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {unassigned ? (
            <span className="flex items-center gap-1.5">
              <UserX aria-hidden className="size-4" />
              Nobody has picked this ticket up yet
            </span>
          ) : null}
          {awaiting ? (
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden className="size-4" />
              Awaiting a first response
              {openedAge ? ` — opened ${openedAge}` : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      <Section title="Overview">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Category"
            value={ticket.category ? humanize(String(ticket.category)) : "—"}
          />
          <Field
            label="Priority"
            value={ticket.priority ? humanize(String(ticket.priority)) : "—"}
          />
          <Field
            label="Status"
            value={
              ticket.status_label?.trim() || humanize(String(ticket.status))
            }
          />

          <Field label="Raised by" value={raisedBy ?? "—"} />
          <Field label="Assigned to" value={assignedTo ?? "Unassigned"} />
          <Field
            label="Assigned at"
            value={formatDateTime(ticket.assigned_at)}
          />

          <Field label="Opened" value={formatDateTime(ticket.created_at)} />
          <Field
            label="First response"
            value={
              ticket.first_responded_at
                ? formatDateTime(ticket.first_responded_at)
                : "Not yet"
            }
          />
          {/* The workflow's own last step, when the API sends one. This portal
              reports those events; it does not drive them. */}
          <Field
            label="Last activity"
            value={
              <>
                {formatDateTime(ticket.last_event_at ?? ticket.updated_at)}
                {ticket.last_event_code ? (
                  <span className="block text-xs text-muted-foreground">
                    {humanize(String(ticket.last_event_code))}
                  </span>
                ) : null}
              </>
            }
          />

          <Field label="Resolved at" value={formatDateTime(ticket.resolved_at)} />
          <Field label="Closed at" value={formatDateTime(ticket.closed_at)} />
          <Field
            label="Related shipment"
            value={
              ticket.consignment_id ? (
                <Link
                  href={`/consignments/request/${ticket.consignment_id}`}
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  <Package aria-hidden className="size-3.5" />
                  {ticket.tracking_no || `Consignment #${ticket.consignment_id}`}
                </Link>
              ) : (
                "—"
              )
            }
          />

          <Field
            label="Customer"
            value={ticket.customer_id ? `Customer #${ticket.customer_id}` : "—"}
          />
        </div>
      </Section>

      <Section title="What was reported">
        {/* `whitespace-pre-wrap`: the description is typed by a person and its
            line breaks carry meaning. */}
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">
          {ticket.description?.trim() || (
            <span className="text-muted-foreground">
              No description was given.
            </span>
          )}
        </p>
      </Section>

      {ticket.resolution?.trim() ? (
        <Section title="Resolution">
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">
            {ticket.resolution}
          </p>
        </Section>
      ) : null}

      <TicketThread ticket={ticket} />
    </div>
  );
}

/** The same rhythm with the values blanked, so the page does not jump. */
export function TicketDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <Skeleton className="mb-4 h-4 w-28" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {Array.from({ length: 2 }).map((_, section) => (
        <Card key={section}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
