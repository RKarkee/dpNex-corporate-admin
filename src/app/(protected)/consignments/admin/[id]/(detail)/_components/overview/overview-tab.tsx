"use client";

import { useCountryOptions } from "@/shared/hooks/use-location-options";

import { BoxesManager } from "../../../../_components/boxes-manager";
import { useConsignmentAdminPermissions } from "../../../../_hooks/use-consignment-admin-permissions";
import { useConsignment } from "../../../../_hooks/use-consignments";
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
  const { canUpdate } = useConsignmentAdminPermissions();
  const { options: countryOptions } = useCountryOptions();

  // The shell renders the loading and error states and only mounts a tab once
  // there is a record; this guard is for the render between the two.
  if (!data) return null;

  const { consignment, boxes } = data;

  const sender = (consignment.sender ?? {}) as Record<string, string | undefined>;
  const receiver = (consignment.receiver ?? {}) as Record<
    string,
    string | undefined
  >;

  return (
    <div className="space-y-6">
      <StatusSection consignment={consignment} />
      <CustomerSection consignment={consignment} />
      <RoutingSection consignment={consignment} boxCount={boxes.length} />

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

      {/* Boxes and items keep their own dialogs — unchanged by the tab split.
          The write actions inside stay behind the commented-out buttons. */}
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

      <PickupSection consignment={consignment} />
      <ValueSection consignment={consignment} />
    </div>
  );
}
