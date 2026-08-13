"use client";

import * as React from "react";

import { OverviewTab } from "./_components/overview/overview-tab";

/**
 * The Overview tab, at the bare `/consignments/request/{id}` URL.
 *
 * The default tab has no segment of its own so every existing link to a
 * consignment request keeps working and lands here.
 */
export default function ConsignmentRequestOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  // The layout has already rejected an unparseable id before this mounts.
  return <OverviewTab id={Number(id)} />;
}
