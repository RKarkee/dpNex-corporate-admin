"use client";

import * as React from "react";

import { can } from "@/shared/auth/permissions";
import { useOptionalSession } from "@/shared/auth/session-context";

import { permissionForType } from "../permissions";
import { APPROVAL_TYPES, type ApprovalType } from "../types";

/**
 * What the signed-in user may do with approval requests.
 *
 * Approvals are granted per type, so this answers per type too. `canCancel` is
 * the same check as `canRequest` on purpose: withdrawing is the caller taking
 * back their own request, and the API has no separate grant for it.
 *
 * The names live in `../permissions.ts`, which carries no `"use client"`
 * directive because the Server Component pages import them for their route
 * guards. Re-exporting them from here would hand those pages a proxy instead
 * of an array.
 */
export interface ApprovalPermissions {
  /** Anything at all — the list page is worth showing for one type. */
  canView: boolean;
  canCreate: boolean;
  /** The types this user may raise, in the order the picker should list them. */
  allowedTypes: ApprovalType[];
  canRequest: (type: ApprovalType | string) => boolean;
  /** Whether a pending request of this type may be withdrawn. */
  canCancel: (type: ApprovalType | string) => boolean;
}

export function useApprovalPermissions(): ApprovalPermissions {
  const user = useOptionalSession();

  return React.useMemo(() => {
    const allowedTypes = APPROVAL_TYPES.filter((type) => {
      const permission = permissionForType(type);
      return permission ? can(user, permission) : false;
    });

    const canRequest = (type: ApprovalType | string) => {
      const permission = permissionForType(type);
      // An unrecognised type — one the API added since — is not hidden: the
      // row still renders, it simply offers no withdraw button.
      return permission ? can(user, permission) : false;
    };

    return {
      canView: allowedTypes.length > 0,
      canCreate: allowedTypes.length > 0,
      allowedTypes,
      canRequest,
      canCancel: canRequest,
    };
  }, [user]);
}
