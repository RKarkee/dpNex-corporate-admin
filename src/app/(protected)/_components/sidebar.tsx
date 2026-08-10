"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useSession } from "@/shared/auth/session-context";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { filterNavByPermission, sidebarNav } from "@/shared/config/navigation";
import { cn } from "@/shared/lib/utils";

import { useSidebarStore } from "../_store/sidebar-store";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/* ------------------------------------------------------------------ */
/* Desktop rail                                                        */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const user = useSession();

  const items = filterNavByPermission(sidebarNav, user);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex",
        "transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[76px]" : "w-[272px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Brand compact={collapsed} />
        {!collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="text-muted-foreground"
          >
            <PanelLeftClose className="size-[18px]" />
          </Button>
        ) : null}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <SidebarNav items={items} collapsed={collapsed} />
      </div>

      {collapsed ? (
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="w-full text-muted-foreground"
          >
            <PanelLeftOpen className="size-[18px]" />
          </Button>
        </div>
      ) : (
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DpNEx
          </p>
        </div>
      )}
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

  const items = filterNavByPermission(sidebarNav, user);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Main navigation menu
        </SheetDescription>

        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
