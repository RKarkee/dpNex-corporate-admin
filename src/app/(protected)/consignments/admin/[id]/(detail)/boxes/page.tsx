"use client";

import * as React from "react";

import { BoxesManager } from "./_components/boxes-manager";

/**
 * The Boxes tab — the boxes on this consignment, each expanding to its items.
 *
 * Read-only: `BoxesManager` lists them, and the eye on a row or an item opens
 * the details dialog. There is nothing to gate, so unlike the request module's
 * equivalent this needs no permissions hook and no wrapper component.
 */
export default function ConsignmentBoxesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  // The layout has already rejected an unparseable id before this mounts.
  return <BoxesManager consignmentId={Number(id)} />;
}
