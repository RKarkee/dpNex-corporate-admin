"use client";

import * as React from "react";

import { BoxesTab } from "./_components/boxes-tab";

/**
 * The Boxes tab.
 *
 * Mirrors the Overview page: a client component, because `React.use(params)`
 * unwraps the promise during render and the panel below is interactive anyway.
 */
export default function ConsignmentRequestBoxesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  // The layout has already rejected an unparseable id before this mounts.
  return <BoxesTab id={Number(id)} />;
}
