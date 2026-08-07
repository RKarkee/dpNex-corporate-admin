"use client";

import * as React from "react";

import { QueryProvider } from "@/shared/providers/query-provider";

/** Single mount point for every client-side provider. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
