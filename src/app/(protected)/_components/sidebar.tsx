"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";

import { useSession } from "@/shared/auth/session-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { filterNavByPermission } from "@/shared/config/navigation";
import { sidebarNav } from "@/shared/config/nav-constant";
import { cn } from "@/shared/lib/utils";

import {
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  useCloseDrawerOnNavigate,
  useSidebar,
} from "../_hooks/use-sidebar";
import { useSidebarStore } from "../_store/sidebar-store";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/* ------------------------------------------------------------------ */
/* Desktop rail                                                        */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const { collapsed, ready, toggleCollapsed } = useSidebar();
  const user = useSession();

  const items = React.useMemo(
    () => filterNavByPermission(sidebarNav, user),
    [user],
  );

  return (
    <aside
      data-collapsed={collapsed}
      style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex",
        // No transition until the persisted width is known, or a saved
        // collapsed rail visibly animates shut on every page load.
        ready && "transition-[width] duration-200 ease-in-out",
      )}
    >
      {/*
        One toggle, pinned to the rail's right border at the header divider.
        It sits in the same place in both states — only the chevron flips —
        so the control never has to be hunted for. Straddling the border
        (`translate-x-1/2`) keeps it clear of the nav items underneath.
      */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={`${collapsed ? "Expand" : "Collapse"} sidebar  (⌘B)`}
        className={cn(
          "absolute right-0 top-16 z-10 grid size-6 -translate-y-1/2 translate-x-1/2 place-items-center",
          "rounded-full border border-sidebar-border bg-card text-muted-foreground shadow-soft",
          "transition-colors hover:border-primary/40 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        <ChevronLeft
          className={cn(
            "size-3.5 transition-transform duration-200",
            collapsed && "rotate-180",
          )}
          strokeWidth={2.5}
        />
      </button>

      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Brand compact={collapsed} />
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SidebarNav items={items} collapsed={collapsed} />
      </div>

      {!collapsed ? (
        <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DpNEx
          </p>
        </div>
      ) : null}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile drawer                                                       */
/* ------------------------------------------------------------------ */

export function MobileSidebar() {
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const user = useSession();

  useCloseDrawerOnNavigate();

  const items = React.useMemo(
    () => filterNavByPermission(sidebarNav, user),
    [user],
  );

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      {/* `flex` + `min-h-0` on the scroller, or the nav list overflows the
          drawer instead of scrolling inside it. */}
      <SheetContent side="left" className="flex w-[280px] flex-col p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Main navigation menu
        </SheetDescription>

        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
