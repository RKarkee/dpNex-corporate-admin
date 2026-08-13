import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { TabPlaceholder } from "../_components/tab-placeholder";

export const metadata: Metadata = {
  title: "Locations",
};

/**
 * The Locations tab.
 *
 * A landing page for now. `GET /corporate/consignmentrequests/{id}/locations`
 * is the endpoint this will read; whether it returns tracking scans or address
 * points decides the layout, so it stays a placeholder until a real response
 * settles that.
 */
export default function ConsignmentRequestLocationsPage() {
  return (
    <TabPlaceholder
      icon={MapPin}
      title="Locations are not connected yet"
      description="Pickup, transit and delivery points for this request will appear here."
    />
  );
}
