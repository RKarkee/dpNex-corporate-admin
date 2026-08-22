import {
  Boxes,
  FileText,
  MapPin,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

/**
 * The tabs on the consignment request detail page.
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
 * consignment request had to know to append it.
 */
export interface DetailTab {
  /** Appended to `/consignments/request/{id}`. Empty for the default tab. */
  segment: string;
  label: string;
  icon: LucideIcon;
}

export const DETAIL_TABS: DetailTab[] = [
  { segment: "", label: "Overview", icon: ScrollText },
  // Directly after Overview: boxes and their items are the substance of a
  // consignment, and the tab replaces the manager that used to sit inline on
  // the overview panel.
  { segment: "boxes", label: "Boxes", icon: Boxes },
  { segment: "documents", label: "Documents", icon: FileText },
  { segment: "locations", label: "Locations", icon: MapPin },
];

/** `/consignments/request/10` or `/consignments/request/10/documents`. */
export function tabHref(id: number | string, segment: string): string {
  const base = `/consignments/request/${id}`;
  return segment ? `${base}/${segment}` : base;
}
