"use client";

import * as React from "react";

import { SessionProvider } from "@/shared/auth/session-context";
import type { User } from "@/shared/auth/types";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";

import { useSidebarStore } from "../_store/sidebar-store";
import { Header } from "./header";
import { MobileSidebar, Sidebar } from "./sidebar";

/** App shell: sidebar (rail on desktop, drawer on mobile) + sticky header + main. */
export function ProtectedLayout({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <SessionProvider user={user}>
      <TooltipProvider>
        <div className="min-h-svh bg-background">
          <Sidebar />
          <MobileSidebar />

          <div
            className={cn(
              "flex min-h-svh flex-col transition-[padding] duration-200 ease-in-out",
              collapsed ? "lg:pl-[76px]" : "lg:pl-[272px]",
            )}
          >
            <Header />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SessionProvider>
  );
}
