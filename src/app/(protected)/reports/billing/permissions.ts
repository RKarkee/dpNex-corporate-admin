/**
 * The permission names the Billing report checks.
 *
 * No confirmed `view_billing`-style grant is published for this org-wide
 * resource — the Billing Accounts sidebar entry has the same gap (see its
 * comment in `nav-constant.ts`) — so this report is left without a
 * permission gate rather than guessing a name the backend may never
 * enforce. Revisit once the corporate's actual billing-report grants are
 * confirmed.
 */
export const BILLING_REPORT_PERMISSIONS: string[] = [];
