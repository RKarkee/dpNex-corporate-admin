/**
 * The permission names the Consignment Request report checks. Plain data,
 * no directive (see `consignments/admin/permissions.ts` for why).
 *
 * This report covers the same pending/approved/rejected request figures the
 * Consignment Request and Consignment Admin sections already gate on, so it
 * reuses their view grants rather than inventing a new "reports" permission
 * the backend has not published.
 */
export const REQUEST_REPORT_PERMISSIONS: string[] = [
  "view_any_consignment",
  "approve_consignment",
  "view_consignment",
  "create_consignment",
];
