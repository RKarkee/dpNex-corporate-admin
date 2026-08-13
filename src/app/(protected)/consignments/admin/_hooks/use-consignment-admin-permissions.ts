"use client";

import { canAny } from "@/shared/auth/permissions";
import { useOptionalSession } from "@/shared/auth/session-context";

import { CONSIGNMENT_ADMIN_PERMISSIONS } from "../permissions";

/**
 * What the signed-in user may do with corporate consignments.
 *
 * The names themselves live in `../permissions.ts`, which carries no
 * `"use client"` directive — the Server Component pages import them for their
 * `RequirePermission` guards, and re-exporting them from here would hand those
 * pages a client-reference proxy instead of an array.
 */

export interface ConsignmentAdminPermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function useConsignmentAdminPermissions(): ConsignmentAdminPermissions {
  const user = useOptionalSession();

  return {
    canView: canAny(user, CONSIGNMENT_ADMIN_PERMISSIONS.view),
    canCreate: canAny(user, CONSIGNMENT_ADMIN_PERMISSIONS.create),
    // Boxes and items have no permissions of their own — they are part of the
    // consignment, so editing one is editing it.
    canUpdate: canAny(user, CONSIGNMENT_ADMIN_PERMISSIONS.update),
    canDelete: canAny(user, CONSIGNMENT_ADMIN_PERMISSIONS.delete),
  };
}
