/**
 * The permission names this feature checks. Plain data, no directive.
 *
 * **This file must not be `"use client"`.** `page.tsx` imports these for its
 * `RequirePermission` guard; across the server boundary a `"use client"`
 * module hands back a client-reference proxy, and spreading it throws.
 *
 * `/me` publishes no billing-account grant of its own, so the section rides on
 * the `billing` group's `view_billing` — the same grant as the Invoice list.
 *
 * There is no grant for changing the default either. That is left to the
 * server: "Make default" follows each account's
 * `available_actions.can_mark_primary`, and the API refuses a removal it does
 * not allow, with the reason shown in the confirm dialog.
 */

/** Opening the list or one account. */
export const BILLING_ACCOUNT_VIEW_PERMISSIONS: string[] = ["view_billing"];
