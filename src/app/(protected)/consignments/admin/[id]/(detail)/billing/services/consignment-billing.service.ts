import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { BillingStatement, Invoice, InvoiceAdjustment, InvoiceLine, StatementPayment } from "../types";

/**
 * `/corporate/consignments/{consignmentId}/billings` — the bills raised
 * against one consignment.
 *
 * **Unverified contract.** Only the list URL was given
 * (`GET /corporate/consignments/{id}/billings`). The detail, PDF, summary and
 * statement paths follow this API's established sub-resource pattern — the
 * same bet `documents.service.ts` makes for its own unconfirmed create/update
 * paths — and the envelope readers below accept the shapes already confirmed
 * for the corporate-wide equivalents in `billing-accounts`.
 */

function basePath(consignmentId: number | string): string {
  return `/corporate/consignments/${consignmentId}/billings`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Picks the invoice array out of whichever envelope this endpoint uses — same fallback order `readInvoices` uses in `billing-accounts`. */
function readInvoiceList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.invoices)) return raw.invoices.filter(isRecord);
  if (Array.isArray(raw.billings)) return raw.billings.filter(isRecord);

  const data = raw.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    if (Array.isArray(data.invoices)) return data.invoices.filter(isRecord);
    if (Array.isArray(data.billings)) return data.billings.filter(isRecord);
    if (Array.isArray(data.data)) return data.data.filter(isRecord);
  }

  return [];
}

/**
 * Picks the single invoice record out of the envelope.
 *
 * `privateApiClient.get()` already unwraps the response down to the
 * envelope's `data` field (see `extractData` in `create-client.ts`), so by
 * the time it lands here `raw` is already `{ invoices: {...} }` — the same
 * *plural*-key-holding-a-single-object quirk confirmed for the corporate-wide
 * `/corporate/billing/invoices/{id}`. `raw.data` is checked too, purely as a
 * defensive fallback in case this ever receives the full, un-unwrapped body.
 */
function readInvoiceDetail(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    raw.invoices,
    raw.billings,
    raw.invoice,
    raw.billing,
    data?.invoices,
    data?.billings,
    data?.invoice,
    data?.billing,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate) && "id" in candidate) return candidate;
  }

  return null;
}

const ZERO_AMOUNTS: Invoice["amounts"] = {
  gross: "0.0000",
  discount: "0.0000",
  taxable: "0.0000",
  tax: "0.0000",
  net: "0.0000",
  adjustments: "0.0000",
  advance: "0.0000",
  payable: "0.0000",
  paid: "0.0000",
  outstanding: "0.0000",
};

/** Fills in the fields the table and detail view dereference directly, without inventing data. */
function normalizeInvoice(raw: Record<string, unknown>): Invoice {
  const id = raw.id;

  return {
    ...raw,
    id: typeof id === "number" || typeof id === "string" ? id : 0,
    invoice_no: typeof raw.invoice_no === "string" ? raw.invoice_no : `#${id}`,
    invoice_date: typeof raw.invoice_date === "string" ? raw.invoice_date : "",
    due_date: typeof raw.due_date === "string" ? raw.due_date : null,
    status: typeof raw.status === "string" ? raw.status : "",
    status_label:
      typeof raw.status_label === "string" ? raw.status_label : (raw.status as string) || "—",
    currency: typeof raw.currency === "string" ? raw.currency : "",
    amounts: isRecord(raw.amounts) ? (raw.amounts as unknown as Invoice["amounts"]) : ZERO_AMOUNTS,
  };
}

export interface ConsignmentInvoiceListParams {
  consignmentId: number | string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface ConsignmentInvoiceListResult {
  items: Invoice[];
  meta?: PageMeta;
}

export async function listConsignmentInvoices({
  consignmentId,
  page = 1,
  perPage = 15,
  signal,
}: ConsignmentInvoiceListParams): Promise<ConsignmentInvoiceListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    basePath(consignmentId),
    undefined,
    {
      params: { page, per_page: perPage },
      // The tab renders its own error card; the client's toast would double up.
      silent: true,
      signal,
    },
  );

  return {
    items: readInvoiceList(response.raw).map(normalizeInvoice),
    meta: response.meta,
  };
}

export async function fetchConsignmentInvoice(
  consignmentId: number | string,
  invoiceId: number | string,
  signal?: AbortSignal,
): Promise<Invoice> {
  const raw = await privateApiClient.get<unknown>(`${basePath(consignmentId)}/${invoiceId}`, {
    // The dialog renders its own not-found; the client's toast would double up.
    silent: true,
    signal,
  });

  const record = readInvoiceDetail(raw);
  if (!record) throw new ApiError(404, "Invoice not found.", { payload: raw });

  return normalizeInvoice(record);
}

/**
 * Picks the particulars array out of the envelope.
 *
 * Confirmed live: the endpoint answers under `invoicedetails`, and — same as
 * `readInvoiceDetail` — `get()` has already unwrapped the response down to
 * the envelope's `data` field, so `raw` here is `{ invoicedetails: [...] }`
 * directly. `particulars`/`details` and the nested `raw.data.*` forms stay
 * as defensive fallbacks only.
 */
function readParticulars(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.invoicedetails)) return raw.invoicedetails.filter(isRecord);
  if (Array.isArray(raw.particulars)) return raw.particulars.filter(isRecord);
  if (Array.isArray(raw.details)) return raw.details.filter(isRecord);

  const data = raw.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    if (Array.isArray(data.invoicedetails)) return data.invoicedetails.filter(isRecord);
    if (Array.isArray(data.particulars)) return data.particulars.filter(isRecord);
    if (Array.isArray(data.details)) return data.details.filter(isRecord);
    if (Array.isArray(data.data)) return data.data.filter(isRecord);
  }

  return [];
}

/** Fills in the fields `InvoiceDetailContent` dereferences directly, without inventing data. */
function normalizeParticular(raw: Record<string, unknown>): InvoiceLine {
  const id = raw.id;
  const numericId = typeof id === "number" ? id : typeof id === "string" ? Number(id) : NaN;

  return {
    ...raw,
    id: Number.isFinite(numericId) ? numericId : 0,
    sort_order: typeof raw.sort_order === "number" ? raw.sort_order : 0,
    code: typeof raw.code === "string" ? raw.code : null,
    particular: typeof raw.particular === "string" ? raw.particular : "—",
    description: typeof raw.description === "string" ? raw.description : null,
    is_monetary: raw.is_monetary === "Y" ? "Y" : "N",
    display_value: typeof raw.display_value === "string" ? raw.display_value : null,
    calculation_type: typeof raw.calculation_type === "string" ? raw.calculation_type : "FIXED",
    quantity: typeof raw.quantity === "string" ? raw.quantity : "0.000",
    quantity_code: typeof raw.quantity_code === "string" ? raw.quantity_code : null,
    rate: typeof raw.rate === "string" ? raw.rate : "0.0000",
    amount: typeof raw.amount === "string" ? raw.amount : "0.0000",
    source: typeof raw.source === "string" ? raw.source : "INFO",
  };
}

/**
 * The bill's line items — `GET
 * /corporate/consignments/{id}/billings/{billingId}/particulars`.
 *
 * The invoice detail read already carries these under `details`, so this is
 * only used where the particulars are wanted independently of the rest of the
 * bill (the detail page fetches both and prefers this list, falling back to
 * `invoice.details` while it is in flight or if it fails — see
 * `ConsignmentInvoiceDetailPage`).
 */
export async function fetchConsignmentInvoiceParticulars(
  consignmentId: number | string,
  invoiceId: number | string,
  signal?: AbortSignal,
): Promise<InvoiceLine[]> {
  const raw = await privateApiClient.get<unknown>(
    `${basePath(consignmentId)}/${invoiceId}/particulars`,
    {
      // The page falls back to invoice.details on failure; no toast needed.
      silent: true,
      signal,
    },
  );

  return readParticulars(raw).map(normalizeParticular);
}

/**
 * Picks the payments array out of the envelope — same shape and fallback
 * order `readParticulars` uses, with `allocations` kept as a fallback key
 * since that is what this bill's own detail read calls the same records.
 */
function readPayments(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.payments)) return raw.payments.filter(isRecord);
  if (Array.isArray(raw.allocations)) return raw.allocations.filter(isRecord);

  const data = raw.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    if (Array.isArray(data.payments)) return data.payments.filter(isRecord);
    if (Array.isArray(data.allocations)) return data.allocations.filter(isRecord);
    if (Array.isArray(data.data)) return data.data.filter(isRecord);
  }

  return [];
}

/**
 * Fills in the fields the payments table dereferences directly.
 *
 * Shaped like `StatementPayment` — the same record the corporate-wide bill
 * statement already renders a payments table from — rather than the leaner
 * `InvoiceAllocation` the invoice detail read embeds under `allocations`,
 * since a dedicated payments endpoint is the more likely place to find a
 * channel, a source and a transaction id.
 */
function normalizePayment(raw: Record<string, unknown>): StatementPayment {
  const id = raw.id;

  return {
    ...raw,
    id: typeof id === "number" || typeof id === "string" ? id : 0,
    payment_date:
      typeof raw.payment_date === "string"
        ? raw.payment_date
        : typeof raw.allocated_on === "string"
          ? raw.allocated_on
          : "",
    amount: typeof raw.amount === "string" ? raw.amount : "0.0000",
    payment_channel: typeof raw.payment_channel === "string" ? raw.payment_channel : null,
    payment_source: typeof raw.payment_source === "string" ? raw.payment_source : null,
    transaction_id: typeof raw.transaction_id === "string" ? raw.transaction_id : null,
    status: typeof raw.status === "string" ? raw.status : "",
  };
}

/**
 * The payments applied to this bill — `GET
 * /corporate/consignments/{id}/billings/{billingId}/payments`.
 *
 * **Unverified schema** — no response has been confirmed for this one yet.
 * Normalized into the same shape as `StatementPayment` on the bet that a
 * dedicated payments endpoint answers with at least what the bill statement's
 * already-confirmed payments list carries; every field still falls back to a
 * safe default if the real response turns out leaner.
 */
export async function fetchConsignmentInvoicePayments(
  consignmentId: number | string,
  invoiceId: number | string,
  signal?: AbortSignal,
): Promise<StatementPayment[]> {
  const raw = await privateApiClient.get<unknown>(
    `${basePath(consignmentId)}/${invoiceId}/payments`,
    {
      // The page falls back to invoice.allocations on failure; no toast needed.
      silent: true,
      signal,
    },
  );

  return readPayments(raw).map(normalizePayment);
}

/** Picks the adjustments array out of the envelope — same shape and fallback order `readParticulars`/`readPayments` use. */
function readAdjustments(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.adjustments)) return raw.adjustments.filter(isRecord);

  const data = raw.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    if (Array.isArray(data.adjustments)) return data.adjustments.filter(isRecord);
    if (Array.isArray(data.data)) return data.data.filter(isRecord);
  }

  return [];
}

/** Fills in the fields the adjustments table dereferences directly, without inventing data. */
function normalizeAdjustment(raw: Record<string, unknown>): InvoiceAdjustment {
  const id = raw.id;

  return {
    ...raw,
    id: typeof id === "number" || typeof id === "string" ? id : 0,
    reason:
      typeof raw.reason === "string"
        ? raw.reason
        : typeof raw.particular === "string"
          ? raw.particular
          : "Adjustment",
    description: typeof raw.description === "string" ? raw.description : null,
    amount: typeof raw.amount === "string" ? raw.amount : "0.0000",
    type: typeof raw.type === "string" ? raw.type : null,
    status: typeof raw.status === "string" ? raw.status : "",
    status_label:
      typeof raw.status_label === "string" ? raw.status_label : (raw.status as string) || "—",
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    approved_by: typeof raw.approved_by === "string" ? raw.approved_by : null,
    approved_at: typeof raw.approved_at === "string" ? raw.approved_at : null,
  };
}

/**
 * The adjustments approved against this bill — `GET
 * /corporate/consignments/{id}/billings/{billingId}/adjustments`.
 *
 * **Unverified schema** — no response has been confirmed for this one yet;
 * see the note on `InvoiceAdjustment` in `types.ts`. Unlike particulars and
 * payments there is no embedded field on the invoice detail read to fall back
 * to (`amounts.adjustments` is only the summed total), so the detail page
 * simply shows nothing here until this resolves.
 */
export async function fetchConsignmentInvoiceAdjustments(
  consignmentId: number | string,
  invoiceId: number | string,
  signal?: AbortSignal,
): Promise<InvoiceAdjustment[]> {
  const raw = await privateApiClient.get<unknown>(
    `${basePath(consignmentId)}/${invoiceId}/adjustments`,
    {
      // The page simply shows nothing here on failure; no toast needed.
      silent: true,
      signal,
    },
  );

  return readAdjustments(raw).map(normalizeAdjustment);
}

/**
 * The bill as a PDF — `GET /corporate/consignments/{id}/billings/{billingId}/pdf`.
 * Not `silent`: there is no inline error state for a download action.
 */
export async function downloadConsignmentInvoicePdf(
  consignmentId: number | string,
  invoiceId: number | string,
  signal?: AbortSignal,
): Promise<Blob> {
  const blob = await privateApiClient.get<Blob>(
    `${basePath(consignmentId)}/${invoiceId}/pdf`,
    { responseType: "blob", signal },
  );

  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new ApiError(502, "The PDF could not be generated. Please try again.");
  }

  return blob;
}

/**
 * `/corporate/consignments/{id}/billings/summary` — no confirmed schema, same
 * situation as the corporate-wide `/corporate/billing/summary`. Hands back
 * whatever record the envelope carries; `_lib/summarize-billing.ts` reads it
 * defensively from there.
 */
export type ConsignmentBillingSummary = Record<string, unknown>;

function readSummary(raw: unknown): ConsignmentBillingSummary {
  if (!isRecord(raw)) return {};

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [data?.summary, data?.billing_summary, data, raw.summary, raw];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return {};
}

export async function fetchConsignmentBillingSummary(
  consignmentId: number | string,
  signal?: AbortSignal,
): Promise<ConsignmentBillingSummary> {
  const raw = await privateApiClient.get<unknown>(`${basePath(consignmentId)}/summary`, {
    silent: true,
    signal,
  });

  return readSummary(raw);
}

/** Picks the statement object out of the envelope — `data.statement`, confirmed for the corporate-wide equivalent. */
function readStatement(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [data?.statement, data, raw.statement, raw];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return null;
}

function normalizeStatement(record: Record<string, unknown>): BillingStatement {
  return {
    ...record,
    period: isRecord(record.period) ? (record.period as BillingStatement["period"]) : { from: "", to: "" },
    opening_balance: typeof record.opening_balance === "string" ? record.opening_balance : "0.0000",
    closing_balance: typeof record.closing_balance === "string" ? record.closing_balance : "0.0000",
    totals: isRecord(record.totals)
      ? (record.totals as BillingStatement["totals"])
      : { billed: "0.0000", paid: "0.0000", outstanding: "0.0000" },
    invoices: Array.isArray(record.invoices)
      ? (record.invoices.filter(isRecord) as BillingStatement["invoices"])
      : [],
    payments: Array.isArray(record.payments)
      ? (record.payments.filter(isRecord) as BillingStatement["payments"])
      : [],
  };
}

export interface ConsignmentStatementParams {
  consignmentId: number | string;
  /** `YYYY-MM-DD`. */
  from: string;
  /** `YYYY-MM-DD`. */
  to: string;
  signal?: AbortSignal;
}

export async function fetchConsignmentBillingStatement({
  consignmentId,
  from,
  to,
  signal,
}: ConsignmentStatementParams): Promise<BillingStatement> {
  const raw = await privateApiClient.get<unknown>(`${basePath(consignmentId)}/statement`, {
    params: { from, to },
    silent: true,
    signal,
  });

  const record = readStatement(raw);
  if (!record) throw new ApiError(502, "The statement could not be generated. Please try again.");

  return normalizeStatement(record);
}
