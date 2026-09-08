import type { Metadata } from "next";

import { BillingTab } from "./_components/billing-tab";

export const metadata: Metadata = {
  title: "Billing",
};

/**
 * The Billing tab.
 *
 * A server component that does nothing but read the route param and hand it
 * down — same shape as `documents/page.tsx` — since the tab is interactive
 * (search, paging, dialogs) and owns its own data through React Query.
 */
export default async function ConsignmentBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <BillingTab consignmentId={id} />;
}
