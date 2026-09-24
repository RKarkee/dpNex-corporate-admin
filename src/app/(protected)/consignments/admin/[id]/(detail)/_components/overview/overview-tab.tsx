"use client";

import * as React from "react";
import { UserPen } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useCountryOptions } from "@/shared/hooks/use-location-options";

import { useConsignment } from "../../../../_hooks/use-consignments";
import type {
  AssignmentHistoryEntry,
  ConsignmentEventEntry,
} from "../../../../types";
import { DetailActions } from "../actions/detail-actions";
import { UpdatePartyDialog } from "../actions/update-party-dialog";
import {
  AssignmentHistorySection,
  CustomerSection,
  EventsSection,
  PartySection,
  PickupSection,
  RoutingSection,
  StatusSection,
  ValueSection,
} from ".";

/**
 * The Overview tab — everything the detail page used to show, in order.
 *
 * Reads the record with `useConsignment`, the same call the shell makes. That
 * is a cache hit, not a second request: the shell only mounts a tab once the
 * record has loaded, so by the time this runs the data is already there.
 * Reading from the hook rather than taking it as a prop is what lets each tab
 * be an independent route rather than something the layout has to thread props
 * into.
 *
 * The country list is fetched once here and passed to both parties — it is the
 * same list for each, and two mounts of the hook would be two subscribers to
 * one cache entry for no reason.
 */
export function OverviewTab({ id }: { id: number }) {
  const { data } = useConsignment(id);
  const { options: countryOptions } = useCountryOptions();
  const [editingParty, setEditingParty] = React.useState<"sender" | "receiver" | null>(
    null,
  );

  // The shell renders the loading and error states and only mounts a tab once
  // there is a record; this guard is for the render between the two.
  if (!data) return null;

  const { consignment, boxes } = data;

  const sender = (consignment.sender ?? {}) as Record<string, string | undefined>;
  const receiver = (consignment.receiver ?? {}) as Record<
    string,
    string | undefined
  >;

  // Record-level gates only — no user permission is published for these.
  const canUpdateSender = consignment.can_update_sender === true;
  const canUpdateReceiver = consignment.can_update_receiver === true;

  const partyAction = (party: "sender" | "receiver", label: string) => (
    <Button size="sm" variant="outline" onClick={() => setEditingParty(party)}>
      <UserPen className="size-4" aria-hidden />
      {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* The workflow actions — room for more buttons as they arrive. */}
      <DetailActions consignment={consignment} />

      <StatusSection consignment={consignment} />
      <CustomerSection consignment={consignment} />
      <RoutingSection consignment={consignment} boxCount={boxes.length} />

      <PartySection
        title="Sender"
        prefix="sender"
        party={sender}
        countryOptions={countryOptions}
        action={canUpdateSender ? partyAction("sender", "Update sender") : undefined}
      />
      <PartySection
        title="Receiver"
        prefix="receiver"
        party={receiver}
        countryOptions={countryOptions}
        action={canUpdateReceiver ? partyAction("receiver", "Update receiver") : undefined}
      />

      {/* Boxes and items keep their own dialogs — unchanged by the tab split.
          The write actions inside stay behind the commented-out buttons. */}
      {/* Boxes and items now live in their own tab. `RoutingSection` above
          still reports the count, which is the part that belongs on a summary;
          inspecting them is a task, and a task deserves its own route. */}

      <PickupSection consignment={consignment} />
      <ValueSection consignment={consignment} />

      {/* Read-only workflow logs, shown only when the response carries them. */}
      {Array.isArray(consignment.assignment_histories) ? (
        <AssignmentHistorySection
          histories={consignment.assignment_histories as AssignmentHistoryEntry[]}
          currentAssignmentId={consignment.current_assignment?.id}
        />
      ) : null}
      {Array.isArray(consignment.events) ? (
        <EventsSection events={consignment.events as ConsignmentEventEntry[]} />
      ) : null}

      {editingParty ? (
        <UpdatePartyDialog
          consignmentId={consignment.id}
          party={editingParty}
          detail={data}
          open
          onOpenChange={(open) => !open && setEditingParty(null)}
        />
      ) : null}
    </div>
  );
}
