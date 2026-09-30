/**
 * The permission names the Summary report checks. Plain data, no directive
 * (see `consignments/admin/permissions.ts` for why).
 *
 * This report mixes org-wide consignment and billing figures — closer in
 * scope to the main Dashboard (which is open to every signed-in user) than
 * to any single resource — but since it lives under the Reports menu
 * alongside the Consignment report, it reuses that report's view grants
 * rather than leaving every report in the section gated differently.
 */
export const SUMMARY_REPORT_PERMISSIONS: string[] = [
  "view_any_consignment",
  "approve_consignment",
  "view_consignment",
];
