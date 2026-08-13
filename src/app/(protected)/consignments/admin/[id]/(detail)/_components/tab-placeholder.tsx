import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";

/**
 * A tab that has a route and a place in the nav, but nothing behind it yet.
 *
 * Deliberately not a "coming soon" splash: it uses the same `EmptyState` every
 * other empty list on the site uses, so when the endpoint lands the only change
 * is swapping this for a real table — the empty case already looks right.
 *
 * The wording says the section is not connected rather than that it is empty,
 * because "no documents" would be a claim about the consignment that this
 * component is in no position to make.
 */
export function TabPlaceholder({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} />;
}
