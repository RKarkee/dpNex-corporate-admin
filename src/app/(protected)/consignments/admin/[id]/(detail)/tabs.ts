import { FileText, MapPin, ScrollText, type LucideIcon } from "lucide-react";

/**
 * The tabs on the consignment detail page.
 *
 * Plain data, no directive — the tab nav is a client component but the layout
 * that positions it is not, and a constant crossing that boundary from a
 * `"use client"` module would arrive as a client-reference proxy rather than an
 * array.
 *
 * `segment` is the URL segment, not a query param: each tab is a real route, so
 * it is linkable, refreshable, prefetched, and back/forward works without any
 * state of our own. Overview's segment is empty because it lives at the bare
 * `/[id]` URL — making it `/[id]/overview` would mean every link to a
 * consignment had to know to append it.
 *
 * Deliberately separate from the Consignment Request module's copy: these are
 * different resources, and the day one grows a tab the other does not need,
 * this file is where that happens.
 */
export interface DetailTab {
  /** Appended to `/consignments/admin/{id}`. Empty for the default tab. */
  segment: string;
  label: string;
  icon: LucideIcon;
}

export const DETAIL_TABS: DetailTab[] = [
  { segment: "", label: "Overview", icon: ScrollText },
  { segment: "documents", label: "Documents", icon: FileText },
  { segment: "locations", label: "Locations", icon: MapPin },
];

/** `/consignments/admin/10` or `/consignments/admin/10/documents`. */
export function tabHref(id: number | string, segment: string): string {
  const base = `/consignments/admin/${id}`;
  return segment ? `${base}/${segment}` : base;
}
