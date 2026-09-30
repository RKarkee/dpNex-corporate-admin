/**
 * The permission names the Customer report checks.
 *
 * No `view_customer`-style grant is published anywhere in this API surface
 * yet (see `billing-accounts/nav-constant.ts`'s own note on the same gap for
 * that resource), so — like Billing Accounts — this report is left without a
 * permission gate rather than guessing a name the backend may never enforce.
 * Revisit once the corporate's actual customer/CRM grants are confirmed.
 */
export const CUSTOMER_REPORT_PERMISSIONS: string[] = [];
