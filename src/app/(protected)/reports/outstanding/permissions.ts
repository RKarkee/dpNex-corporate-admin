/**
 * The permission names the Outstanding report checks.
 *
 * No confirmed `view_billing`-style grant is published for this org-wide
 * resource — same gap as the Billing report and Billing Accounts sections
 * (see their own comments) — so this report is left without a permission
 * gate rather than guessing a name the backend may never enforce.
 */
export const OUTSTANDING_REPORT_PERMISSIONS: string[] = [];
