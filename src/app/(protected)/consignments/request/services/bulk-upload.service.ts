import { ApiError, extractFieldErrors, isApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import { ENDPOINTS } from "./consignment-request.service";

/**
 * Bulk upload of consignment requests from a spreadsheet —
 * `/corporate/consignmentrequests/bulk-upload…`. The same contract the staff
 * console uses under `/admin/…`.
 *
 *   POST bulk-upload                     one multipart `file` (.xlsx, .xls, .csv; max 10 MB)
 *   GET  bulk-upload/template            the blank template            → a FILE
 *   GET  bulk-upload/{batch_code}        the batch's status and counts → JSON
 *   GET  bulk-upload/{batch_code}/rows   each row's result, paginated  → JSON
 *   GET  bulk-upload/{batch_code}/errors the batch's error report      → a FILE
 *
 * A bad file comes back as a 422 with the reason under `errors.file`
 * ("Missing required column(s): …").
 *
 * The two JSON shapes are not pinned down yet, so both are read defensively
 * and the UI renders whatever fields arrive. The file calls go through the
 * private client as blobs — a plain link would go out without the bearer
 * token and 401.
 *
 * Everything is `silent`: each caller renders its own error state.
 */

export const BULK_UPLOAD_ACCEPT = [".xlsx", ".xls", ".csv"] as const;
export const BULK_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export interface BulkUploadResult {
  /** The API's own success message. */
  message: string;
  /** The batch the upload was filed under, when the response carries one. */
  batchCode: string | null;
}

/** One upload batch as the API describes it — fields not pinned down yet. */
export type BulkUploadBatch = Record<string, unknown>;

export interface BulkUploadRowsResult {
  rows: Record<string, unknown>[];
  meta: PageMeta | undefined;
}

/** A fetched file: the bytes plus the name to save them under. */
export interface BulkUploadFile {
  blob: Blob;
  filename: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Statuses meaning the batch is still being worked on — the status view says
 * so, and the status query re-checks on its own while one is showing.
 */
export function isBatchInProgress(batch: BulkUploadBatch | null | undefined): boolean {
  return ["PROCESSING", "QUEUED", "PENDING", "IN_PROGRESS", "RUNNING"].includes(
    String(batch?.status ?? "").toUpperCase(),
  );
}

/** Finds a `batch_code` anywhere in the first few levels of a response. */
function findBatchCode(value: unknown, depth = 0): string | null {
  if (!isRecord(value) || depth > 3) return null;
  const direct = value.batch_code ?? value.batchCode;
  if (typeof direct === "string" && direct.trim()) return direct;
  for (const child of Object.values(value)) {
    const found = findBatchCode(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/** The first array of row objects — `data`, `data.rows`, or `data.<anything>`. */
function findRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];
  if (Array.isArray(data.rows)) return data.rows.filter(isRecord);
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.every(isRecord)) return value as Record<string, unknown>[];
  }
  for (const value of Object.values(data)) {
    if (isRecord(value)) {
      const nested = findRows(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

/**
 * The batch record inside a response: a single-key wrapper like
 * `data.bulkupload` / `data.batch`, or `data` itself.
 */
function findBatchRecord(body: unknown): BulkUploadBatch | null {
  const data = isRecord(body) && "data" in body ? body.data : body;
  if (!isRecord(data)) return null;
  const nested = Object.values(data).filter(isRecord);
  const primitives = Object.values(data).filter((v) => v === null || typeof v !== "object");
  // `{ bulkupload: {...} }` — a wrapper holding exactly one record and nothing else.
  if (nested.length === 1 && primitives.length === 0) return nested[0] ?? null;
  return data;
}

/** A sensible extension for the fallback file name, from the response type. */
function extensionFor(contentType: string | null): string {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("csv")) return "csv";
  if (type.includes("ms-excel")) return "xls";
  return "xlsx";
}

/** `attachment; filename="x.xlsx"` → `x.xlsx`. */
function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

/**
 * With `responseType: "blob"` an error body arrives as a Blob too, so the
 * client can only offer its generic copy for the status. Reads the JSON back
 * out and rethrows with the server's own `message`.
 */
async function rethrowBlobError(error: unknown): Promise<never> {
  if (isApiError(error) && error.payload instanceof Blob) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await error.payload.text());
    } catch {
      throw error; // not JSON — the generic message is the best there is
    }
    const message =
      isRecord(parsed) && typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message
        : error.message;
    throw new ApiError(error.status, message, {
      payload: parsed,
      fieldErrors: extractFieldErrors(parsed),
      cause: error.cause,
    });
  }
  throw error;
}

async function fetchFile(path: string, fallbackName: (ext: string) => string): Promise<BulkUploadFile> {
  try {
    const response = await privateApiClient.request<unknown>("GET", path, undefined, {
      responseType: "blob",
      silent: true,
    });
    const blob = response.data instanceof Blob ? response.data : response.raw;
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new ApiError(502, "The file came back empty. Please try again.");
    }
    const ext = extensionFor(response.headers.get("content-type") ?? blob.type);
    return {
      blob,
      filename: filenameFrom(response.headers.get("content-disposition"), fallbackName(ext)),
    };
  } catch (error) {
    return rethrowBlobError(error);
  }
}

/* -------------------------------------------------------------------------- */

/** `POST …/bulk-upload` — one multipart `file`. */
export async function uploadBulkConsignmentRequests(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<BulkUploadResult> {
  const form = new FormData();
  form.set("file", file, file.name);

  const response = await privateApiClient.request<unknown>("POST", ENDPOINTS.bulkUpload, form, {
    silent: true,
    onUploadProgress: onProgress,
  });

  return {
    message: response.message || "File uploaded",
    batchCode: findBatchCode(response.raw),
  };
}

/** `GET …/bulk-upload/template` — the blank spreadsheet. */
export function fetchBulkUploadTemplate(): Promise<BulkUploadFile> {
  return fetchFile(ENDPOINTS.bulkUploadTemplate, (ext) => `consignment-bulk-upload-template.${ext}`);
}

/** `GET …/bulk-upload/{batch_code}/errors` — the batch's error report. */
export function fetchBulkUploadErrorReport(batchCode: string): Promise<BulkUploadFile> {
  const code = batchCode.trim();
  return fetchFile(ENDPOINTS.bulkUploadErrors(code), (ext) => `bulk-upload-${code}-errors.${ext}`);
}

/** `GET …/bulk-upload/{batch_code}` — the batch's status and counts. */
export async function fetchBulkUploadBatch(
  batchCode: string,
  signal?: AbortSignal,
): Promise<BulkUploadBatch | null> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ENDPOINTS.bulkUploadBatch(batchCode.trim()),
    undefined,
    { silent: true, signal },
  );
  return findBatchRecord(response.raw);
}

/** `GET …/bulk-upload/{batch_code}/rows` — each row's result, one page at a time. */
export async function fetchBulkUploadRows(
  batchCode: string,
  page: number,
  perPage: number,
  signal?: AbortSignal,
): Promise<BulkUploadRowsResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ENDPOINTS.bulkUploadRows(batchCode.trim()),
    undefined,
    { params: { page, per_page: perPage }, silent: true, signal },
  );
  const raw = response.raw;
  return {
    rows: findRows(isRecord(raw) && "data" in raw ? raw.data : raw),
    meta: response.meta,
  };
}
