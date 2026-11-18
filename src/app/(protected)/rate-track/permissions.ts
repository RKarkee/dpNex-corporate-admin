/**
 * The permission names this feature checks, from `/me`. Plain data, no
 * directive — `page.tsx` imports them for its `RequirePermission` guard, and
 * across the server boundary a `"use client"` module would hand back a proxy.
 */
export const RATE_TRACK_PERMISSIONS = {
  /** The Check rate tab — the `rates` group. */
  rates: "view_rate",
  /** The Track shipment tab — the `consignments` group. */
  track: "track_consignment",
} as const;

/** Opening the page needs either; each tab then checks its own. */
export const RATE_TRACK_PAGE_PERMISSIONS: string[] = [
  RATE_TRACK_PERMISSIONS.rates,
  RATE_TRACK_PERMISSIONS.track,
];
