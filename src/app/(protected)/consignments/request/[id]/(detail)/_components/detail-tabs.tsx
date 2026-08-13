"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";

import { DETAIL_TABS, tabHref } from "../tabs";

/**
 * The tab bar on the detail page.
 *
 * Links, not buttons. Each tab is its own route, so the browser does the
 * navigating — which means middle-click and "open in new tab" work, the back
 * button steps between tabs, and there is no active-tab state to keep in sync
 * with the URL.
 *
 * `usePathname` is the single source of truth for which tab is active. Overview
 * matches only on an exact path, since its href is a prefix of every other
 * tab's and would otherwise always look selected.
 */
export function DetailTabs({ id }: { id: number }) {
  const pathname = usePathname();

  return (
    <div
      // A real tablist would own focus management and `aria-controls`; these are
      // links that navigate, so the honest role is a navigation landmark.
      role="navigation"
      aria-label="Consignment request sections"
      className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
    >
      {DETAIL_TABS.map((tab) => {
        const href = tabHref(id, tab.segment);
        const active = tab.segment
          ? pathname.startsWith(href)
          : pathname === href;

        const Icon = tab.icon;

        return (
          <Link
            key={tab.segment || "overview"}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
