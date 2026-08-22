import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import { fetchFileAsFile } from "@/shared/api/services/file.service";

import type { DocumentType, KycDocument } from "../types";
import {
  isDocumentType,
  isKycStatus,
  kycBackRequired,
  kycRequiresFrontBack,
} from "../types";

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

/**
 * One document, read fresh before it is viewed or edited.
 *
 * The list row is enough to render a card, but not to seed an edit: a list
 * response is free to omit or truncate `file_path` / `back_file_path`, and the
 * edit form needs both to preview the stored scans and to re-send them. Reading
 * the record again also means the dialog never opens onto a status a reviewer
 * changed since the list was cached.
 *
 * Falls back to the single-record envelope keys the list reader already knows.
 */
export async function fetchKycDocument(
  id: number,
  signal?: AbortSignal,
): Promise<KycDocument> {
  const raw = await privateApiClient.get<unknown>(`${KYC_PATH}/${id}`, {
    silent: true,
    signal,
  });

  if (!isRecord(raw)) throw unexpectedShape(raw);

  const candidates: unknown[] = [
    raw.kycdocument,
    raw.kyc_document,
    raw.document,
    raw.data,
    raw,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const doc = normalizeDocument(candidate);
    if (doc) return doc;
  }

  throw unexpectedShape(raw);
}

/* -------------------------------------------------------------------------- */
/* File slots                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Thrown when a save would carry no file for a slot that needs one.
 *
 * A domain error, deliberately **not** an `ApiError`: no request is made, and
 * nothing about this is the service's fault or the network's. The hook catches
 * it and renders the copy; this layer stays free of UI concerns.
 *
 * On an edit this is now close to unreachable — `hydrateSelection` fills the
 * untouched slots from the stored scans first, so it only fires when a scan
 * could not be re-downloaded *and* the user picked nothing.
 */
export class KycFileRequiredError extends Error {
  /** Which slots still need a file — drives the wording and the field markers. */
  readonly slots: KycFileSlot[];

  constructor(slots: KycFileSlot[]) {
    super(`KYC save requires a file for: ${slots.join(", ")}`);
    this.name = "KycFileRequiredError";
    this.slots = slots;
  }
}

/**
 * The three slots the form can render.
 *
 * These are *UI* names. On the wire there are only two keys — `front_file`
 * and `file` are both sent as `file`; see `buildForm`.
 */
export type KycFileSlot = "file" | "front_file" | "back_file";

/** What the user has actually picked, per slot. */
export interface KycFileSelection {
  file?: File | null;
  front_file?: File | null;
  back_file?: File | null;
}

/**
 * Which slots a save is still missing. Empty means it may proceed.
 *
 * The back side is only demanded for the types that genuinely require it
 * (`kycBackRequired`). A national ID renders a back slot and will send it when
 * filled, but saves fine without — so this must not simply mirror
 * `kycRequiresFrontBack`.
 *
 * Exported as a plain predicate so the form and the service read the same rule.
 */
export function missingKycFiles(
  type: DocumentType,
  selection: KycFileSelection,
): KycFileSlot[] {
  const missing: KycFileSlot[] = [];

  if (kycRequiresFrontBack(type)) {
    if (!selection.front_file) missing.push("front_file");
    if (!selection.back_file && kycBackRequired(type)) missing.push("back_file");
  } else if (!selection.file) {
    missing.push("file");
  }

  return missing;
}

/**
 * Fills the slots the user did not touch with the scans already on the record.
 *
 * **Why an edit re-sends files that are already stored.** The API's update
 * semantics are unverified: we do not know whether omitting a file field
 * preserves the existing scan or wipes it. KYC scans may be the user's only
 * copy, so the safe reading is assumed — every file the document needs is
 * present in every request.
 *
 * Previously that cost was paid by the user, who had to re-pick both scans to
 * correct a typo. It is paid here instead: the untouched slots are downloaded
 * through the authenticated file endpoint and re-attached verbatim. The
 * guarantee is identical and the dialog needs no warning banner.
 *
 * A slot the user *did* fill is never overwritten, and a scan that fails to
 * download is left `null` — `missingKycFiles` then decides whether that is
 * fatal, which for an optional back side it is not.
 *
 * Only called on update. A create has nothing stored to hydrate from.
 */
export async function hydrateSelection(
  type: DocumentType,
  selection: KycFileSelection,
  stored: { file_path?: string | null; back_file_path?: string | null },
): Promise<KycFileSelection> {
  const twoSided = kycRequiresFrontBack(type);

  // `file_path` is the front side for a two-sided document and the only scan
  // for every other type — one key, two readings, decided by the type.
  const frontSlot: KycFileSlot = twoSided ? "front_file" : "file";

  const [front, back] = await Promise.all([
    selection[frontSlot]
      ? Promise.resolve(selection[frontSlot] ?? null)
      : fetchFileAsFile(stored.file_path, "document"),
    twoSided && !selection.back_file
      ? fetchFileAsFile(stored.back_file_path, "document-back")
      : Promise.resolve(selection.back_file ?? null),
  ]);

  return {
    ...selection,
    [frontSlot]: front,
    back_file: twoSided ? back : null,
  };
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

  /**
   * The file mapping, which is the whole contract:
   *
   *   two-sided (citizenship, national ID)
   *     front side → `file`        back side → `back_file`
   *
   *   everything else (passport, PAN, VAT, company registration, licence)
   *     the one scan → `file`      `back_file` is not sent at all
   *
   * There is no `front_file` key on the wire, and no separate key for images
   * versus PDFs — `file` carries whichever the user picked. The form's
   * `front_file` slot name exists only so the two upload boxes can be told
   * apart in the UI, and it is collapsed onto `file` right here.
   *
   * Read back, the same two keys arrive as `file_path` and `back_file_path`.
   */
  if (kycRequiresFrontBack(input.document_type)) {
    if (selection.front_file) {
      form.set("file", selection.front_file, selection.front_file.name);
    }
    // Omitted entirely when absent — a national ID may legitimately have no
    // back scan, and an empty part would reach Laravel as `""` and fail its
    // file validation rather than being read as "not provided".
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
 * `POST /corporate/kycdocuments/{id}` with `_method=PATCH`.
 *
 * Same PHP constraint `updateUser` documents: `$_FILES` is not populated for a
 * multipart PUT/PATCH body, and the scans have to ride along — so the request
 * goes out as a POST carrying the real verb in `_method`.
 *
 * PATCH, matching every other write in this app (`users`, the consignment
 * boxes and items, the consignment request documents). An earlier version spoofed
 * PUT here on the assumption that a full-record update needed it; that was never
 * confirmed against a live response and was simply wrong.
 *
 * `stored` is the record as it currently exists. Any slot the user left alone
 * is re-downloaded from it and re-sent, so a text-only edit needs no file
 * picking at all. The guard then runs against the *hydrated* selection, which
 * is why it now fires only when a scan is genuinely unavailable.
 */
export async function updateKycDocument(
  id: number,
  input: KycDocumentInput,
  selection: KycFileSelection,
  stored: { file_path?: string | null; back_file_path?: string | null },
): Promise<MutationResult> {
  const hydrated = await hydrateSelection(input.document_type, selection, stored);

  const missing = missingKycFiles(input.document_type, hydrated);
  if (missing.length) throw new KycFileRequiredError(missing);

  const form = buildForm(input, hydrated);
  form.set("_method", "PATCH");

  return privateApiClient.mutate("POST", `${KYC_PATH}/${id}`, form, {
    silent: true,
  });
}

export function deleteKycDocument(id: number): Promise<MutationResult> {
  return privateApiClient.mutate("DELETE", `${KYC_PATH}/${id}`, undefined, {
    silent: true,
  });
}
