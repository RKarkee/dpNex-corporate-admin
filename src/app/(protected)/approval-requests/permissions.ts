import { APPROVAL_TYPES, type ApprovalType } from "./types";

/**
 * The permission names this feature checks. Plain data, no directive.
 *
 * **This file must not be `"use client"`.** `page.tsx` and `[id]/page.tsx`
 * import these arrays for their `RequirePermission` guards; across the server
 * boundary a `"use client"` module hands back a client-reference proxy, and
 * spreading it throws at runtime. Same reasoning as
 * `consignments/request/permissions.ts`.
 *
 * Approvals are granted **per request type**, not per action: there is no
 * separate "view" or "cancel" name. Holding `request_discounts` is what lets
 * someone ask for a discount, see the requests they raised, and withdraw one
 * while it is still pending — a request is the caller's own record, and the
 * endpoint is self-scoped, so nothing further is needed to read or retract it.
 */
export const APPROVAL_TYPE_PERMISSIONS: Record<ApprovalType, string> = {
  CREDIT_LIMIT_INCREASE: "request_credit_limit",
  DISCOUNT: "request_discounts",
  CORPORATE_INFO_UPDATE: "request_corporate_setting_update",
  PROFILE_UPDATE: "request_profile_update",
};

/**
 * Opening the list needs any one of them.
 *
 * Someone who can request only discounts still has a list worth seeing — it is
 * just a list with one kind of row in it.
 */
export const APPROVAL_LIST_PERMISSIONS: string[] = APPROVAL_TYPES.map(
  (type) => APPROVAL_TYPE_PERMISSIONS[type],
);

/** The permission behind one type, or `undefined` for a type we do not know. */
export function permissionForType(type: ApprovalType | string): string | undefined {
  return APPROVAL_TYPE_PERMISSIONS[type as ApprovalType];
}
