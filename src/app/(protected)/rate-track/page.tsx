import { Suspense } from "react";
import type { Metadata } from "next";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { RateTrackView } from "./_components/rate-track-view";
import { RATE_TRACK_PAGE_PERMISSIONS } from "./permissions";

export const metadata: Metadata = {
  title: "Check Rate / Track",
};

/**
 * Check a shipping rate or track a shipment, on one page. `useSearchParams`
 * (the active tab) needs the Suspense boundary or the build fails on prerender.
 */
export default function RateTrackPage() {
  return (
    <RequirePermission anyOf={RATE_TRACK_PAGE_PERMISSIONS}>
      <PageHeader
        title="Check Rate / Track"
        description="Get a shipping quote for a destination, or follow a shipment by its tracking number."
      />
      <Suspense fallback={null}>
        <RateTrackView />
      </Suspense>
    </RequirePermission>
  );
}
