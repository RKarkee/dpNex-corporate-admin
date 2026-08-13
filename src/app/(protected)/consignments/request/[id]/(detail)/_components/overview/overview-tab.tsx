"use client";

import { useCountryOptions } from "@/shared/hooks/use-location-options";

import { BoxesManager } from "../../../../_components/boxes-manager";
import { useConsignmentPermissions } from "../../../../_hooks/use-consignment-permissions";
import { useConsignmentRequest } from "../../../../_hooks/use-consignment-request";
import {
  CustomerSection,
  PartySection,
  PickupSection,
  RoutingSection,
  StatusSection,
  ValueSection,
} from ".";

/**
 * The Overview tab — everything the detail page used to show, in order.
 *
 * Reads the record with `useConsignmentRequest`, the same call the shell makes.
 * That is a cache hit, not a second request: the shell only mounts a tab once
 * the record has loaded, so by the time this runs the data is already there.
 * Reading from the hook rather than taking it as a prop is what lets each tab
 * be an independent route rather than something the layout has to thread props
 * into.
 *
 * The country list is fetched once here and passed to both parties — it is the
 * same list for each, and two mounts of the hook would be two subscribers to
 * one cache entry for no reason.
 */
export function OverviewTab({ id }: { id: number }) {
  const { data } = useConsignmentRequest(id);
  const { canUpdate } = useConsignmentPermissions();
  const { options: countryOptions } = useCountryOptions();

  // The shell renders the loading and error states and only mounts a tab once
  // there is a record; this guard is for the render between the two.
  if (!data) return null;

  const { request, boxes } = data;

  const sender = (request.sender ?? {}) as Record<string, string | undefined>;
  const receiver = (request.receiver ?? {}) as Record<string, string | undefined>;

  return (
    <div className="space-y-6">
      <StatusSection request={request} />
      <CustomerSection request={request} />
      <RoutingSection request={request} boxCount={boxes.length} />

      <PartySection
        title="Sender"
        prefix="sender"
        party={sender}
        countryOptions={countryOptions}
      />
      <PartySection
        title="Receiver"
        prefix="receiver"
        party={receiver}
        countryOptions={countryOptions}
      />

      {/* Boxes and items keep their own dialogs — unchanged by the tab split. */}
      <BoxesManager
        consignmentId={id}
        permissions={{
          canAddBoxes: canUpdate,
          canUpdateBoxes: canUpdate,
          canDeleteBoxes: canUpdate,
          canAddItems: canUpdate,
          canUpdateItems: canUpdate,
          canDeleteItems: canUpdate,
        }}
      />

      <PickupSection request={request} />
      <ValueSection request={request} />
    </div>
  );
}
