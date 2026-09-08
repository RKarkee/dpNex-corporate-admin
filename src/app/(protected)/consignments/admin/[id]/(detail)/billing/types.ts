/**
 * The billing domain for one consignment, as
 * `/corporate/consignments/{id}/billings` models it.
 *
 * A standalone sibling of `billing-accounts/types.ts` — same underlying
 * invoice resource, confirmed there against a live response, but this is a
 * different endpoint family scoped to one consignment rather than the whole
 * corporate. Kept separate rather than imported so this tab is free to
 * diverge the day the two need different fields, the same reasoning
 * `consignments/admin`'s own document types give for not sharing with the
 * Consignment Request module.
 *
 * Numbers arrive as decimal strings (`"62.0000"`), not JSON numbers.
 */

export type YesNo = "Y" | "N";

export type InvoiceLineCalculationType = "FIXED" | "PER_KG" | (string & {});
export type InvoiceLineSource = "INFO" | "CHARGE" | "MANUAL" | (string & {});

export interface InvoiceLine {
  id: number;
  sort_order: number;
  code: string | null;
  particular: string;
  description: string | null;
  is_monetary: YesNo;
  display_value: string | null;
  calculation_type: InvoiceLineCalculationType;
  quantity: string;
  quantity_code: string | null;
  rate: string;
  amount: string;
  source: InvoiceLineSource;

  [key: string]: unknown;
}

/**
 * One adjustment applied to a bill — a manual credit, correction or waiver
 * approved against it. `amounts.adjustments` on `Invoice` is only the
 * summed total; this is the itemised list behind that figure, from
 * `GET .../billings/{billingId}/adjustments`.
 *
 * **Unverified schema** — no response has been confirmed for this endpoint
 * yet. Field names follow the same conventions the rest of this bill uses
 * (`status`/`status_label` for an approval state, decimal-string amounts),
 * and every field the table reads is defaulted defensively in the service.
 */
export interface InvoiceAdjustment {
  id: number | string;
  reason: string;
  description: string | null;
  amount: string;
  type: string | null;

  status: string;
  status_label: string;

  created_at: string | null;
  approved_by: string | null;
  approved_at: string | null;

  [key: string]: unknown;
}

export interface InvoiceAllocation {
  id: number;
  payment_id: number;
  invoice_id: number;
  amount: string;
  allocated_on: string;
  exchange_rate: string;

  [key: string]: unknown;
}

export interface InvoiceConsignmentRef {
  id: number;
  tracking_no: string;
  status: string;

  [key: string]: unknown;
}

export interface InvoiceParty {
  name: string | null;
  address?: string | null;
  account?: string | null;
  pan?: string | null;
  vat?: string | null;
  email?: string | null;
  phone?: string | null;
  tagline?: string | null;
  contact?: string | null;
  website?: string | null;

  [key: string]: unknown;
}

export interface InvoiceAmounts {
  gross: string;
  discount: string;
  taxable: string;
  tax: string;
  net: string;
  adjustments: string;
  advance: string;
  payable: string;
  paid: string;
  outstanding: string;

  [key: string]: unknown;
}

export interface Invoice {
  id: number | string;
  invoice_no: string;
  invoice_date: string;
  due_date: string | null;

  status: string;
  status_label: string;

  bill_ready?: YesNo;

  consignment?: InvoiceConsignmentRef | null;
  consignment_id?: number | string | null;

  currency: string;
  base_currency?: string | null;
  exchange_rate?: string | null;

  amounts: InvoiceAmounts;

  discount_type?: string | null;
  discount_value?: string | null;
  tax_rate?: string | null;

  buyer?: InvoiceParty | null;
  issuer?: InvoiceParty | null;

  payment_terms?: string | null;

  /** Present on the detail response; not expected on the list. */
  details?: InvoiceLine[];
  /** Present on the detail response; not expected on the list. */
  allocations?: InvoiceAllocation[];

  created_at?: string;
  updated_at?: string;

  [key: string]: unknown;
}

/**
 * `/corporate/consignments/{id}/billings/statement` — unverified for this
 * scoped endpoint, but modelled on the confirmed corporate-wide statement
 * (`billing-accounts/types.ts`), which this almost certainly mirrors, filtered
 * to one consignment.
 */

export interface StatementPeriod {
  from: string;
  to: string;

  [key: string]: unknown;
}

export interface StatementTotals {
  billed: string;
  paid: string;
  outstanding: string;

  [key: string]: unknown;
}

export interface StatementInvoiceRef {
  id: number | string;
  invoice_no: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  net_amount: string;
  paid_amount: string;
  outstanding_amount: string;

  [key: string]: unknown;
}

export interface StatementPayment {
  id: number | string;
  payment_date: string;
  amount: string;
  payment_channel: string | null;
  payment_source: string | null;
  transaction_id: string | null;
  status: string;

  [key: string]: unknown;
}

export interface BillingStatement {
  period: StatementPeriod;
  opening_balance: string;
  closing_balance: string;
  totals: StatementTotals;
  invoices: StatementInvoiceRef[];
  payments: StatementPayment[];

  [key: string]: unknown;
}
