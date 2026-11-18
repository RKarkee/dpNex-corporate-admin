"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/shared/lib/utils";

export type RateTrackTab = "rates" | "track";

const LABELS: Record<RateTrackTab, string> = {
  rates: "Check rate",
  track: "Track shipment",
};

/**
 * The tab to show: `?tab=track` asks for tracking, anything else for rates —
 * but only among the tabs this user may open, so a bookmarked link to a tab
 * they lost access to lands on the one they still have.
 */
export function useRateTrackTab(allowed: RateTrackTab[]): RateTrackTab | null {
  const requested: RateTrackTab = useSearchParams().get("tab") === "track" ? "track" : "rates";
  if (allowed.includes(requested)) return requested;
  return allowed[0] ?? null;
}

/** Link tabs: the URL is the only state, so a tab can be bookmarked. */
export function RateTrackTabs({
  tabs,
  active,
}: {
  tabs: RateTrackTab[];
  active: RateTrackTab;
}) {
  const pathname = usePathname();

  // One tab is not a choice — the heading says what the page is.
  if (tabs.length < 2) return null;

  return (
    <div
      role="navigation"
      aria-label="Check rate and track"
      className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => (
        <Link
          key={tab}
          href={tab === "rates" ? pathname : `${pathname}?tab=${tab}`}
          replace
          scroll={false}
          aria-current={tab === active ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === active
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          {LABELS[tab]}
        </Link>
      ))}
    </div>
  );
}
