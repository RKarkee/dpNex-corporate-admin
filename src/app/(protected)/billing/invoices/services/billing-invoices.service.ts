import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { Invoice, InvoiceAmounts } from "../types";

/**
 * `/corporate/billing/invoices` — the corporate's own bills.
 *
 * Scoped by the `X-Corporate-Code` header the private client attaches, the
 * same way `/corporate/users` is — no corporate id travels in this file.
 *
 * Confirmed against a live detail response: both endpoints answer under the
 * same *plural* key, `data.invoices` — an array on the list, a single object
 * on the detail — the same quirk `/corporate/roles/{id}` has.
 */

export interface InvoiceListParams {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface InvoiceListResult {
  items: Invoice[];
  meta?: PageMeta;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ZERO_AMOUNTS: InvoiceAmounts = {
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

/**
 * Fills in what a row needs to render safely, without inventing data the API
 * did not send.
 *
 * Every confirmed field rides through untouched via `...raw` — this only
 * guards the handful of fields the table and detail page dereference
 * directly (`amounts.payable`, `status_label`), so a list row that happens to
 * omit the totals block still renders "—" instead of throwing.
 */
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
    amounts: isRecord(raw.amounts) ? (raw.amounts as unknown as InvoiceAmounts) : ZERO_AMOUNTS,
  };
}

/**
 * Picks the invoice array out of whichever envelope the list endpoint uses.
 *
 * `data.invoices` is confirmed for the detail response; the list is assumed
 * to answer the same way (paginated), with `data.data` and a bare top-level
 * array kept as fallbacks in case pagination changes the wrapper.
 */
function readInvoiceList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.invoices)) return raw.invoices.filter(isRecord);

  const data = raw.data;
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    if (Array.isArray(data.invoices)) return data.invoices.filter(isRecord);
    if (Array.isArray(data.data)) return data.data.filter(isRecord);
  }

  return [];
}

/** Picks the single invoice record out of the envelope — `data.invoices`, confirmed. */
function readInvoiceDetail(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [data?.invoices, data?.invoice, raw.invoices, raw.invoice, data, raw];

  for (const candidate of candidates) {
    if (isRecord(candidate) && "id" in candidate) return candidate;
  }

  return null;
}

export async function listInvoices({
  page = 1,
  perPage = 15,
  signal,
}: InvoiceListParams = {}): Promise<InvoiceListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    "/corporate/billing/invoices",
    undefined,
    {
      params: { page, per_page: perPage },
      // The list renders its own error card; the client's toast would double up.
      silent: true,
      signal,
    },
  );

  return {
    items: readInvoiceList(response.raw).map(normalizeInvoice),
    meta: response.meta,
  };
}

/**
 * One bill, for the detail page — `GET /corporate/billing/invoices/{id}`.
 *
 * Throws when the id resolves to nothing, which the page turns into "Invoice
 * not found" — the same answer a deleted id, a mistyped one, and another
 * corporate's id all deserve, since the API scopes reads to the caller's own
 * corporate.
 */
export async function fetchInvoice(
  invoiceId: number | string,
  signal?: AbortSignal,
): Promise<Invoice> {
  const raw = await privateApiClient.get<unknown>(
    `/corporate/billing/invoices/${invoiceId}`,
    {
      // The page renders its own not-found; the client's toast would double up.
      silent: true,
      signal,
    },
  );

  const record = readInvoiceDetail(raw);
  if (!record) throw new ApiError(404, "Invoice not found.", { payload: raw });

  return normalizeInvoice(record);
}

/**
 * The bill as a PDF — `GET /corporate/billing/invoices/{id}/pdf`.
 *
 * `responseType: "blob"` stops the client trying to parse the PDF bytes as
 * JSON — the same reason `fetchFileDataUrl` uses it for images. Not `silent`:
 * unlike the list and detail reads, there is no inline error state for a
 * download action, so the client's own toast is the only place this failure
 * would otherwise surface.
 */
export async function downloadInvoicePdf(
  invoiceId: number | string,
  signal?: AbortSignal,
): Promise<Blob> {
  const blob = await privateApiClient.get<Blob>(
    `/corporate/billing/invoices/${invoiceId}/pdf`,
    {
      responseType: "blob",
      signal,
    },
  );

  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new ApiError(502, "The PDF could not be generated. Please try again.");
  }

  return blob;
}
