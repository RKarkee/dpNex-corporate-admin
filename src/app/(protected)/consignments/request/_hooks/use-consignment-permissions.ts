"use client";

import { canAny } from "@/shared/auth/permissions";
import { useOptionalSession } from "@/shared/auth/session-context";

import { CONSIGNMENT_PERMISSIONS } from "../permissions";

/**
 * What the signed-in user may do with consignment requests.
 *
 * The names themselves live in `../permissions.ts`, which carries no
 * `"use client"` directive — the Server Component pages import them for their
 * `RequirePermission` guards, and re-exporting them from here would hand those
 * pages a client-reference proxy instead of an array. See that file for why the
 * lists accept aliases.
 */

export interface ConsignmentPermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /** The user's side only — pair with the record's own `can_*` flag. */
  canUpdateStatus: boolean;
  canAddCharges: boolean;
  canUpdateCharges: boolean;
}

export function useConsignmentPermissions(): ConsignmentPermissions {
  const user = useOptionalSession();

  return {
    canView: canAny(user, CONSIGNMENT_PERMISSIONS.view),
    canCreate: canAny(user, CONSIGNMENT_PERMISSIONS.create),
    // Boxes and items have no permissions of their own — they are part of the
    // request, so editing one is editing it.
    canUpdate: canAny(user, CONSIGNMENT_PERMISSIONS.update),
    canDelete: canAny(user, CONSIGNMENT_PERMISSIONS.delete),
    canUpdateStatus: canAny(user, CONSIGNMENT_PERMISSIONS.updateStatus),
    canAddCharges: canAny(user, CONSIGNMENT_PERMISSIONS.addCharges),
    canUpdateCharges: canAny(user, CONSIGNMENT_PERMISSIONS.updateCharges),
  };
}
