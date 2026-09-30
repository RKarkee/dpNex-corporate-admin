/**
 * The permission names the Consignment report checks. Plain data, no
 * directive — imported by the Server Component page and the client hook
 * alike (see `consignments/admin/permissions.ts` for why this file carries
 * no `"use client"`).
 *
 * This report surfaces the same organisation-wide consignment figures the
 * Consignment Admin list does, so it reuses that section's view grants
 * rather than inventing a new "reports" permission the backend has not
 * published.
 */
export const CONSIGNMENT_REPORT_PERMISSIONS: string[] = [
  "view_any_consignment",
  "approve_consignment",
  "view_consignment",
];
