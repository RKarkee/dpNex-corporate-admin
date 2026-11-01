/**
 * The billing-invoice ("bill") domain, as `/corporate/billing/invoices`
 * models it.
 *
 * Confirmed against a live `GET /corporate/billing/invoices/{id}` response.
 * Both endpoints answer under the same envelope quirk `/corporate/roles/{id}`
 * has: the record sits at the *plural* key `data.invoices` — a single object
 * on the detail response, an array of these on the list response.
 *
 * Numbers arrive as decimal strings (`"62.0000"`), not JSON numbers — a
 * Laravel decimal cast serialises that way — so every amount here is typed
 * `string`, matching the convention `consignments/request/types.ts` sets for
 * the same situation. The nested relations (`buyer`, `issuer`, `details`,
 * `allocations`, `consignment`) are only confirmed on the detail response, so
 * they are optional here in case the list row turns out lighter.
 */

export type YesNo = "Y" | "N";

/** The line-item's own charge model — how `amount` was derived from `quantity`/`rate`. */
export type InvoiceLineCalculationType = "FIXED" | "PER_KG" | (string & {});

/** Where a line item came from: shipment metadata, a system-computed charge, or a manual add. */
export type InvoiceLineSource = "INFO" | "CHARGE" | "MANUAL" | (string & {});

/**
 * One row of `details`.
 *
 * `is_monetary: "N"` rows (`MAWB_NO`, `PORT_OF_DESTINATION`, …) are reference
 * facts about the shipment, not charges — `quantity`/`rate`/`amount` sit at
 * `0.0000` on those and `display_value` carries the actual fact instead. Only
 * `is_monetary: "Y"` rows are real charge lines.
 */
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

/** A payment applied against this invoice. */
export interface InvoiceAllocation {
  id: number;
  payment_id: number;
  invoice_id: number;
  amount: string;
  allocated_on: string;
  exchange_rate: string;

  [key: string]: unknown;
}

/** The shipment this bill was raised for. */
export interface InvoiceConsignmentRef {
  id: number;
  tracking_no: string;
  status: string;

  [key: string]: unknown;
}

/** The bill-to and bill-from parties. Every field but `name` is unconfirmed as required. */
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

/** The totals block — every figure in the invoice's own `currency`. */
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

  /** The raw enum, e.g. `"PARTIALLY_PAID"` — drives the status badge's colour. */
  status: string;
  /** The API's own display text, e.g. `"Partially Paid"` — always what's shown. */
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
 * `/corporate/billing/statement` — confirmed against a live response. Unlike
 * the invoice endpoints, this is not one resource under a plural key: it's a
 * single object at `data.statement`, a period summary plus the invoices and
 * payments that fall inside it.
 */

export interface StatementPeriod {
  from: string;
  to: string;

  [key: string]: unknown;
}

/** The period's aggregate figures — same three-way split `Invoice.amounts` uses for one bill. */
export interface StatementTotals {
  billed: string;
  paid: string;
  outstanding: string;

  [key: string]: unknown;
}

/**
 * One row of `statement.invoices` — a trimmed view of `Invoice` scoped to
 * this period, not the full record `fetchInvoice` returns. `status_label` is
 * absent here, unlike the list and detail responses, so `InvoiceStatusBadge`
 * falls back to formatting the raw `status` itself.
 */
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

/** One row of `statement.payments`. */
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
