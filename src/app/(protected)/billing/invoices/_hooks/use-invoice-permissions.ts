"use client";

import * as React from "react";

import { can } from "@/shared/auth/permissions";
import { useOptionalSession } from "@/shared/auth/session-context";

import { INVOICE_PERMISSIONS } from "../permissions";

/**
 * What the signed-in user may do in the Invoice section, beyond viewing it —
 * viewing is guarded at the route.
 */
export function useInvoicePermissions() {
  const user = useOptionalSession();

  return React.useMemo(
    () => ({
      canPrint: can(user, INVOICE_PERMISSIONS.print),
      canViewSummary: can(user, INVOICE_PERMISSIONS.summary),
      canViewStatement: can(user, INVOICE_PERMISSIONS.statement),
    }),
    [user],
  );
}
