/**
 * `/corporate/billingaccounts` — the billing accounts of the signed-in
 * corporate's customer.
 *
 * Every field is optional or nullable: the documented sample fills them all,
 * but a record created before a column existed comes back without it, and the
 * page should render a dash rather than throw.
 */

/** The stored one-letter state: `A` enabled, `I` disabled. */
export const BILLING_ACCOUNT_STATUSES = ["A", "I"] as const;
export type BillingAccountStatus = (typeof BILLING_ACCOUNT_STATUSES)[number];

export interface BillingAddress {
  id: number;
  type?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  zip?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  email?: string | null;
  phone_1?: string | null;
  phone_2?: string | null;
  telephone_1?: string | null;
  telephone_1_ext?: string | null;
  telephone_2?: string | null;
  telephone_2_ext?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  /** A `Y`/`N` flag here, unlike the account's own boolean `is_primary`. */
  is_primary?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * What the server says this caller may do with the account right now.
 *
 * `can_enable` / `can_disable` are typed for completeness but nothing reads
 * them: no enable or disable endpoint is published for the corporate side.
 */
export interface BillingAccountActions {
  can_enable?: boolean;
  can_disable?: boolean;
  can_mark_primary?: boolean;
}

export interface BillingAccount {
  id: number;
  customer_id?: number | null;
  billing_account_code?: string | null;
  account_name?: string | null;
  legal_name?: string | null;
  pan?: string | null;
  vat?: string | null;
  email?: string | null;
  phone_1?: string | null;
  phone_2?: string | null;
  status?: BillingAccountStatus | string | null;
  is_enabled?: boolean | null;
  /** The customer's single default account. */
  is_primary?: boolean | null;
  addresses?: BillingAddress[] | null;
  available_actions?: BillingAccountActions | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

/** Every list filter, as the string the URL and the API both carry. */
export interface BillingAccountFilterValues {
  search: string;
  billing_account_code: string;
  account_name: string;
  pan: string;
  vat: string;
  status: string;
  /** `"true"`, `"false"` or `""` for either. */
  is_primary: string;
  /** ISO-2. */
  country: string;
  city: string;
  created_from: string;
  created_to: string;
}

/* -------------------------------------------------------------------------- */
/* Rules                                                                      */
/* -------------------------------------------------------------------------- */

export function isDefaultAccount(account: BillingAccount): boolean {
  return account.is_primary === true;
}

/**
 * Whether "Make default" is on offer.
 *
 * The server's `can_mark_primary` decides — it knows about disabled accounts
 * and any other rule this side cannot see. The default account itself is
 * excluded too, since making it the default again would change nothing.
 */
export function canBecomeDefault(account: BillingAccount): boolean {
  return (
    !isDefaultAccount(account) &&
    account.available_actions?.can_mark_primary === true
  );
}
