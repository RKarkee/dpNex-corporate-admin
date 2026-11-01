/**
 * The permission names the Invoice section checks, from the `billing` group
 * `/me` returns. Plain data, no directive.
 *
 * **This file must not be `"use client"`.** The Server Component pages import
 * these for their `RequirePermission` guards; across the server boundary a
 * `"use client"` module hands back a client-reference proxy.
 */
export const INVOICE_PERMISSIONS = {
  /** The invoice list and one invoice. */
  view: "view_billing",
  /** Downloading an invoice as PDF. */
  print: "print_billing",
  /** The headline figures above the list. */
  summary: "view_billing_summary",
  /** The date-range statement page. */
  statement: "view_statement",
} as const;
