import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";

import type { DocumentType, KycDocument } from "../types";
import { isDocumentType, isKycStatus, kycRequiresFrontBack } from "../types";

/**
 * `/corporate/kycdocuments` — the customer's identity documents.
 *
 * Two things this file owns beyond the usual transport work:
 *
 * 1. **Envelope normalisation**, on the same strict-envelope/tolerant-record
 *    rule as `profile.service.ts`.
 * 2. **The re-upload guard** — the safety rule that stops an edit from
 *    destroying a scan the API might not be preserving. See below.
 *
 * **Unverified contract.** Neither the envelope keys nor the update semantics
 * were confirmed against a live corporate response; the read probe has not been
 * run and no write probe was permitted. Shapes come from the sibling customer
 * app, which calls the same resource under `/external/kycdocuments`.
 */

const KYC_PATH = "/corporate/kycdocuments";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unexpectedShape(raw: unknown): ApiError {
  return new ApiError(502, "Unexpected response from the service.", {
    payload: raw,
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * An unrecognised envelope throws; a recognised-but-empty one returns `[]`.
 *
 * Same reasoning as the profile reader: "you have no documents" and "we could
 * not read the response" must not look identical to the user, because the first
 * invites an upload and the second needs a retry.
 */
function readDocuments(raw: unknown): KycDocument[] {
  if (Array.isArray(raw)) return normalizeAll(raw);
  if (raw === null || raw === undefined) return [];

  if (!isRecord(raw)) throw unexpectedShape(raw);

  const candidates: unknown[] = [
    raw.kycdocuments,
    raw.kyc_documents,
    raw.documents,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return normalizeAll(candidate);
    // A recognised key holding null is an affirmative "none".
    if (candidate === null) return [];
  }

  throw unexpectedShape(raw);
}

function normalizeAll(rows: unknown[]): KycDocument[] {
  return rows.filter(isRecord).flatMap((row) => {
    const doc = normalizeDocument(row);
    // A row without a usable id cannot be viewed, edited or deleted, so it is
    // dropped rather than rendered as a dead card.
    return doc ? [doc] : [];
  });
}

function normalizeDocument(row: Record<string, unknown>): KycDocument | null {
  if (typeof row.id !== "number") return null;

  return {
    id: row.id,
    // An unknown type would break every `Record<DocumentType, …>` lookup
    // downstream, so it is pinned to a real member of the union.
    document_type: isDocumentType(row.document_type)
      ? row.document_type
      : "CITIZENSHIP",
    document_number: str(row.document_number),
    issue_date: str(row.issue_date),
    expiry_date: optionalStr(row.expiry_date),
    issued_country: str(row.issued_country),
    issued_by: optionalStr(row.issued_by),
    issued_place: optionalStr(row.issued_place),
    status: isKycStatus(row.status) ? row.status : "PENDING",
    file_path: optionalStr(row.file_path),
    back_file_path: optionalStr(row.back_file_path),
    remarks: optionalStr(row.remarks),
  };
}

export async function fetchKycDocuments(
  signal?: AbortSignal,
): Promise<KycDocument[]> {
  const raw = await privateApiClient.get<unknown>(KYC_PATH, {
    silent: true,
    signal,
  });

  return readDocuments(raw);
}

/* -------------------------------------------------------------------------- */
/* The re-upload guard                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Thrown when a save would rely on unverified file-preservation behaviour.
 *
 * A domain error, deliberately **not** an `ApiError`: no request is made, and
 * nothing about this is the service's fault or the network's. The hook catches
 * it and renders the copy; this layer stays free of UI concerns.
 */
export class KycFileRequiredError extends Error {
  /** Which slots still need a file — drives the wording and the field markers. */
  readonly slots: KycFileSlot[];

  constructor(slots: KycFileSlot[]) {
    super(`KYC edit requires a file for: ${slots.join(", ")}`);
    this.name = "KycFileRequiredError";
    this.slots = slots;
  }
}

export type KycFileSlot = "file" | "front_file" | "back_file";

/** What the user has actually picked in the edit dialog, per slot. */
export interface KycFileSelection {
  file?: File | null;
  front_file?: File | null;
  back_file?: File | null;
}

/**
 * Which slots a save is still missing.
 *
 * Empty array means the save may proceed.
 *
 * **Why an edit demands files that are already stored.** The API's update
 * semantics are unverified: we do not know whether omitting a file field
 * preserves the existing scan or wipes it. KYC scans may be the user's only
 * copy, so the safe reading is assumed — every file a document needs must be
 * present in the request, which means re-selecting the ones that did not
 * change.
 *
 * The cost is real: correcting a typo in `document_number` currently requires
 * re-picking the scans. That is why the dialog surfaces the requirement on open
 * rather than letting the user discover it at submit.
 *
 * Exported as a plain predicate so the dialog can disable its submit button
 * from the same rule the service enforces — one source of truth, checked twice.
 *
 * Lifting this: once the write matrix is run, either omission is proven safe
 * (delete the guard) or it is not (keep it, but satisfy it automatically by
 * re-uploading the untouched side). Either way only this file changes.
 */
export function missingKycFiles(
  type: DocumentType,
  selection: KycFileSelection,
): KycFileSlot[] {
  const missing: KycFileSlot[] = [];

  if (kycRequiresFrontBack(type)) {
    if (!selection.front_file) missing.push("front_file");
    if (!selection.back_file) missing.push("back_file");
  } else if (!selection.file) {
    missing.push("file");
  }

  return missing;
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export interface KycDocumentInput {
  document_type: DocumentType;
  document_number: string;
  issue_date: string;
  expiry_date?: string;
  issued_country: string;
  issued_by?: string;
  issued_place?: string;
}

/**
 * Multipart, because scans ride along — the same reason `users.service.ts`
 * posts its profile photo as `FormData`.
 *
 * Empty optional text fields are omitted rather than sent blank: an empty part
 * reaches Laravel as the string `""` and can overwrite a stored value with
 * nothing.
 */
function buildForm(
  input: KycDocumentInput,
  selection: KycFileSelection,
): FormData {
  const form = new FormData();

  form.set("document_type", input.document_type);
  form.set("document_number", input.document_number.trim());
  form.set("issue_date", input.issue_date);
  form.set("issued_country", input.issued_country);

  if (input.expiry_date) form.set("expiry_date", input.expiry_date);
  if (input.issued_by?.trim()) form.set("issued_by", input.issued_by.trim());
  if (input.issued_place?.trim()) {
    form.set("issued_place", input.issued_place.trim());
  }

  if (kycRequiresFrontBack(input.document_type)) {
    // `file` is the API's front-side key; `back_file` carries the reverse.
    if (selection.front_file) {
      form.set("file", selection.front_file, selection.front_file.name);
    }
    if (selection.back_file) {
      form.set("back_file", selection.back_file, selection.back_file.name);
    }
  } else if (selection.file) {
    form.set("file", selection.file, selection.file.name);
  }

  return form;
}

export function createKycDocument(
  input: KycDocumentInput,
  selection: KycFileSelection,
): Promise<MutationResult> {
  // Create is guarded too: a document with no scan is not a document, and the
  // API may or may not enforce that itself.
  const missing = missingKycFiles(input.document_type, selection);
  if (missing.length) throw new KycFileRequiredError(missing);

  return privateApiClient.mutate("POST", KYC_PATH, buildForm(input, selection), {
    silent: true,
  });
}

/**
 * `POST /corporate/kycdocuments/{id}` with `_method=PUT`.
 *
 * Same PHP constraint `updateUser` documents: `$_FILES` is not populated for a
 * multipart PUT/PATCH body, and the scans have to ride along.
 *
 * The guard runs before the payload is built, so an unsafe edit costs no
 * request at all.
 */
export function updateKycDocument(
  id: number,
  input: KycDocumentInput,
  selection: KycFileSelection,
): Promise<MutationResult> {
  const missing = missingKycFiles(input.document_type, selection);
  if (missing.length) throw new KycFileRequiredError(missing);

  const form = buildForm(input, selection);
  form.set("_method", "PUT");

  return privateApiClient.mutate("POST", `${KYC_PATH}/${id}`, form, {
    silent: true,
  });
}

export function deleteKycDocument(id: number): Promise<MutationResult> {
  return privateApiClient.mutate("DELETE", `${KYC_PATH}/${id}`, undefined, {
    silent: true,
  });
}
