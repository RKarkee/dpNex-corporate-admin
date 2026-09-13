import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { InboxView } from "./_components/inbox-view";
import { MarkAllReadButton } from "./_components/mark-all-read-button";
import { NotificationsTableSkeleton } from "./_components/notifications-table";

export const metadata: Metadata = {
  title: "Notifications",
};

/**
 * `useSearchParams` opts the view into client-side rendering, and Next requires
 * it to sit under a Suspense boundary or the build fails on prerender.
 */
export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Everything you have been sent about your shipments, tickets, pickups and requests."
        actions={<MarkAllReadButton />}
      />
      <Suspense fallback={<NotificationsTableSkeleton />}>
        <InboxView />
      </Suspense>
    </>
  );
}
