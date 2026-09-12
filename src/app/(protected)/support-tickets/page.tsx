import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { NewTicketButton } from "./_components/new-ticket-button";
import { TicketsTableSkeleton } from "./_components/tickets-table";
import { TicketsView } from "./_components/tickets-view";

export const metadata: Metadata = {
  title: "Support Tickets",
};

/**
 * No `RequirePermission` wrapper: support is open to every signed-in user of
 * the corporate, and the API scopes every read to the caller's own tickets
 * regardless. Add a guard here if a permission name is introduced later.
 *
 * `useSearchParams` opts the view into client-side rendering, and Next requires
 * it to sit under a Suspense boundary or the build fails on prerender. The
 * fallback is only ever shown for the instant before hydration.
 */
export default function SupportTicketsPage() {
  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Questions and problems you have raised, and what has happened to them."
        actions={<NewTicketButton />}
      />
      <Suspense fallback={<TicketsTableSkeleton />}>
        <TicketsView />
      </Suspense>
    </>
  );
}
