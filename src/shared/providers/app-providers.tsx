"use client";

import * as React from "react";

import { Toaster } from "@/shared/components/toast";
import { QueryProvider } from "@/shared/providers/query-provider";

/** Single mount point for every client-side provider. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      {/* Outside the tree it serves, so a route change cannot unmount a toast
          that is still on screen. */}
      <Toaster />
    </QueryProvider>
  );
}
