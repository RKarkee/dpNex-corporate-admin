"use client";

import * as React from "react";

import { ChargesTab } from "./_components/charges-tab";

/**
 * The Charges tab — a client component, like Locations, because
 * `React.use(params)` unwraps the promise during render and the panel below is
 * interactive anyway.
 */
export default function ConsignmentRequestChargesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  // The layout has already rejected an unparseable id before this mounts.
  return <ChargesTab id={Number(id)} />;
}
