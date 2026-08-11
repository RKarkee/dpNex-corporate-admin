"use client";

import * as React from "react";

import { hydratePermissions } from "@/shared/api/services/auth.service";

import { useAuthStore } from "./auth-store";

/**
 * Refreshes `permissions` and `roles` from `GET /me` once per full page load.
 *
 * The persisted user in localStorage is a snapshot from sign-in. A role
 * changed by an administrator since then would otherwise never reach this tab
 * until the next login — the sidebar would keep offering sections the API now
 * refuses, or hide ones it has just granted.
 *
 * Failure is ignored on purpose. This is an enhancement to what is already in
 * the store; a flaky network must not empty a working sidebar.
 */
export function useSyncPermissions(): void {
  const token = useAuthStore((state) => state.token);

  React.useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    void hydratePermissions(controller.signal).catch(() => {});

    return () => controller.abort();
  }, [token]);
}
