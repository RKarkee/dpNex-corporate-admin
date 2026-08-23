"use client";

import * as React from "react";

import { LocationsTab } from "./_components/locations-tab";

/**
 * The Locations tab.
 *
 * Mirrors the Boxes page: a client component, because `React.use(params)`
 * unwraps the promise during render and the panel below is interactive anyway.
 */
export default function ConsignmentLocationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  // The layout has already rejected an unparseable id before this mounts.
  return <LocationsTab id={Number(id)} />;
}
