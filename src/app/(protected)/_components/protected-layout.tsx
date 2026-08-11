"use client";

import * as React from "react";

import { AuthGuard } from "@/shared/auth/auth-guard";
import { useSyncPermissions } from "@/shared/auth/use-sync-permissions";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";

import {
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  useResponsiveSidebar,
  useSidebar,
  useSidebarShortcut,
} from "../_hooks/use-sidebar";
import { Header } from "./header";
import { MobileSidebar, Sidebar } from "./sidebar";

/** App shell: sidebar (rail on desktop, drawer on mobile) + sticky header + main. */
export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}

/**
 * Split out so nothing inside it renders — and so no `useSession()` runs —
 * until `AuthGuard` has confirmed there is a user to read.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed, ready } = useSidebar();

  useResponsiveSidebar();
  useSidebarShortcut();
  useSyncPermissions();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-svh bg-background">
        <Sidebar />
        <MobileSidebar />

        <div
          // Inline, and matching the rail's own width source, so the two can
          // never drift apart. Below `lg` the rail is a drawer and the offset
          // has to be zero — hence the media query rather than a fixed value.
          style={
            {
              "--sidebar-offset": `${collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH}px`,
            } as React.CSSProperties
          }
          className={cn(
            "flex min-h-svh flex-col lg:pl-[var(--sidebar-offset)]",
            ready && "transition-[padding] duration-200 ease-in-out",
          )}
        >
          <Header />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* `min-w-0` so a wide table scrolls inside the column instead of
                stretching the whole shell past the viewport. */}
            <div className="mx-auto w-full min-w-0 max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
