import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { NewPickupButton } from "./_components/new-pickup-button";
import { PickupsView } from "./_components/pickups-view";

export const metadata: Metadata = {
  title: "Pickup Requests",
};

/**
 * No `RequirePermission` wrapper: booking a collection is open to every
 * signed-in user of the corporate, and the API scopes the list to their own
 * requests regardless. Add a guard here if a permission name is introduced.
 *
 * No Suspense boundary either — unlike the approval and ticket lists, this view
 * reads no search params, so nothing forces it into client-side rendering.
 */
export default function PickupRequestsPage() {
  return (
    <>
      <PageHeader
        title="Pickup Requests"
        description="Vans booked to collect consignments that are ready to go."
        actions={<NewPickupButton />}
      />
      <PickupsView />
    </>
  );
}
