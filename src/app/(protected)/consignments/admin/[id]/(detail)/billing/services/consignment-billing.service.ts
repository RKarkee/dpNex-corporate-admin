import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { BillingStatement, Invoice } from "../types";

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

function readInvoiceDetail(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [data?.invoice, data?.billing, data?.invoices, raw.invoice, raw.billing, data, raw];

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
