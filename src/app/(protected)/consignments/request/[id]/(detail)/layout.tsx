import * as React from "react";

import { RequirePermission } from "@/shared/auth/require-permission";

import { CONSIGNMENT_PERMISSIONS } from "../../permissions";
import { DetailShell } from "./_components/detail-shell";

/**
 * The shared frame for the detail page's tabs.
 *
 * `(detail)` is a route group — it shapes the component tree without appearing
 * in the URL. That is what keeps this layout off `[id]/edit`: editing is a
 * separate page, not a tab, and it sits outside the group so it inherits none
 * of this chrome.
 *
 * Because the header lives here rather than in each tab, switching tabs swaps
 * only the panel below — the title, status and tab bar stay put, and the record
 * is fetched once for all three.
 */
export default async function ConsignmentRequestDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; a layout can simply await it.
  const { id } = await params;

  return (
    <RequirePermission anyOf={CONSIGNMENT_PERMISSIONS.view}>
      <DetailShell id={id}>{children}</DetailShell>
    </RequirePermission>
  );
}
