import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import { fetchFileAsFile } from "@/shared/api/services/file.service";
import type { PageMeta } from "@/shared/api/types";

import type { ConsignmentDocument, DocumentType } from "../types";
import {
  documentBackRequired,
  documentRequiresFrontBack,
  isDocumentStatus,
  isDocumentType,
} from "../types";

/**
 * `/corporate/consignmentrequests/{id}/documents` — the paperwork attached to
 * one consignment request.
 *
 * A standalone sibling of `profile/services/kyc.service.ts`, not a reuse of it.
 * The two share a record shape today, but they are different endpoints under
 * different owners; see the note in `../types.ts`.
 *
 * One structural difference from KYC worth stating up front: **this collection
 * is paginated.** The list returns a page plus a meta block, so the reader here
 * hands back `{ items, meta }` rather than a bare array.
 *
 * **Unverified contract.** Only the list URL was given. The detail, create,
 * update and delete paths follow this API's established sub-resource pattern
 * (see `consignment-boxes.service.ts`, which spoofs its update the same way),
 * and the envelope reader below accepts every key shape the sibling resources
 * use rather than betting on one.
 */

function basePath(requestId: number | string): string {
  return `/corporate/consignmentrequests/${requestId}/documents`;
}

function docPath(requestId: number | string, docId: number | string): string {
  return `${basePath(requestId)}/${docId}`;
}

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

function normalizeDocument(
  row: Record<string, unknown>,
): ConsignmentDocument | null {
  // A row without a usable id cannot be viewed, edited or deleted, so it is
  // dropped rather than rendered as a dead card.
  if (typeof row.id !== "number") return null;

  return {
    id: row.id,
    // An unknown type would break every `Record<DocumentType, …>` lookup
    // downstream, so it is pinned to a real member of the union.
    document_type: isDocumentType(row.document_type)
      ? row.document_type
      : "CITIZENSHIP",
    document_number: str(row.document_number),
    // `remarks` is read as a fallback: the field was renamed to `notes`, and an
    // older record (or an endpoint not yet redeployed) may still answer under
    // the previous key. Dropping it silently would blank a note the user wrote.
    notes: optionalStr(row.notes) ?? optionalStr(row.remarks),
    status: isDocumentStatus(row.status) ? row.status : "PENDING",
    file_path: optionalStr(row.file_path),
    back_file_path: optionalStr(row.back_file_path),
  };
}

function normalizeAll(rows: unknown[]): ConsignmentDocument[] {
  return rows.filter(isRecord).flatMap((row) => {
    const doc = normalizeDocument(row);
    return doc ? [doc] : [];
  });
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export interface DocumentPage {
  items: ConsignmentDocument[];
  meta: PageMeta | undefined;
}

/**
 * One page of documents.
 *
 * `client.paginated` already unwraps `data` and normalises the meta block. It
 * returns whatever array it found, so the rows still go through
 * `normalizeAll` — an unusable row must not reach a card.
 */
export async function listDocuments({
  requestId,
  page,
  perPage = 10,
  signal,
}: {
  requestId: number | string;
  page: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<DocumentPage> {
  const { items, meta } = await privateApiClient.paginated<unknown>(
    basePath(requestId),
    {
      params: { page, per_page: perPage },
      unwrap: "documents",
      silent: true,
      signal,
    },
  );

  return { items: normalizeAll(items), meta };
}

/**
 * One document, read fresh when a dialog opens.
 *
 * A list row is enough to render a card but not to seed an edit: the list may
 * omit or truncate the file references, and the edit form needs both to preview
 * the stored scans and to re-send them.
 */
export async function fetchDocument(
  requestId: number | string,
  docId: number,
  signal?: AbortSignal,
): Promise<ConsignmentDocument> {
  const raw = await privateApiClient.get<unknown>(docPath(requestId, docId), {
    silent: true,
    signal,
  });

  if (!isRecord(raw)) throw unexpectedShape(raw);

  // These routes answer under varying keys, and a sibling resource returns the
  // single record under its *plural* key — so an array is unwrapped to its
  // first entry rather than rejected.
  const candidates: unknown[] = [
    raw.document,
    raw.documents,
    raw.data,
    raw,
  ];

  for (const candidate of candidates) {
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!isRecord(record)) continue;

    const doc = normalizeDocument(record);
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
 * nothing about this is the service's fault or the network's.
 */
export class DocumentFileRequiredError extends Error {
  readonly slots: DocumentFileSlot[];

  constructor(slots: DocumentFileSlot[]) {
    super(`Document save requires a file for: ${slots.join(", ")}`);
    this.name = "DocumentFileRequiredError";
    this.slots = slots;
  }
}

/**
 * The three slots the form can render.
 *
 * These are *UI* names. On the wire there are only two keys — `front_file` and
 * `file` are both sent as `file`; see `buildForm`.
 */
export type DocumentFileSlot = "file" | "front_file" | "back_file";

/** What the user has actually picked, per slot. */
export interface DocumentFileSelection {
  file?: File | null;
  front_file?: File | null;
  back_file?: File | null;
}

/**
 * Which slots a save is still missing. Empty means it may proceed.
 *
 * The back side is only demanded for the types that genuinely require it, so
 * this must not simply mirror `documentRequiresFrontBack`.
 */
export function missingDocumentFiles(
  type: DocumentType,
  selection: DocumentFileSelection,
): DocumentFileSlot[] {
  const missing: DocumentFileSlot[] = [];

  if (documentRequiresFrontBack(type)) {
    if (!selection.front_file) missing.push("front_file");
    if (!selection.back_file && documentBackRequired(type)) {
      missing.push("back_file");
    }
  } else if (!selection.file) {
    missing.push("file");
  }

  return missing;
}

/**
 * Fills the slots the user did not touch with the scans already on the record.
 *
 * The API's update semantics are unverified: we do not know whether omitting a
 * file field preserves the existing scan or wipes it. The safe reading is
 * assumed — every file the document needs is present in every request — and the
 * cost is paid here rather than by the user, who would otherwise have to
 * re-pick both scans to correct a typo.
 *
 * A slot the user *did* fill is never overwritten, and a scan that fails to
 * download is left `null`, so `missingDocumentFiles` decides whether that is
 * fatal.
 */
export async function hydrateSelection(
  type: DocumentType,
  selection: DocumentFileSelection,
  stored: { file_path?: string | null; back_file_path?: string | null },
): Promise<DocumentFileSelection> {
  const twoSided = documentRequiresFrontBack(type);

  // `file_path` is the front side for a two-sided document and the only scan
  // for every other type — one key, two readings, decided by the type.
  const frontSlot: DocumentFileSlot = twoSided ? "front_file" : "file";

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

export interface DocumentInput {
  document_type: DocumentType;
  document_number: string;
  /** Free text from the user. Replaces the old `remarks` field. */
  notes?: string;
}

/**
 * Multipart, because scans ride along.
 *
 * Empty optional text fields are omitted rather than sent blank: an empty part
 * reaches Laravel as the string `""` and can overwrite a stored value with
 * nothing.
 */
function buildForm(
  input: DocumentInput,
  selection: DocumentFileSelection,
): FormData {
  const form = new FormData();

  form.set("document_type", input.document_type);
  form.set("document_number", input.document_number.trim());

  if (input.notes?.trim()) form.set("notes", input.notes.trim());

  /**
   * The file mapping, which is the whole contract:
   *
   *   two-sided    front side → `file`   back side → `back_file`
   *   single-scan  the scan   → `file`   `back_file` not sent at all
   *
   * There is no `front_file` key on the wire, and no separate key for images
   * versus PDFs — `file` carries whichever the user picked. The form's
   * `front_file` slot name exists only so the two upload boxes can be told
   * apart in the UI, and it is collapsed onto `file` right here.
   *
   * Read back, the same two keys arrive as `file_path` and `back_file_path`.
   */
  if (documentRequiresFrontBack(input.document_type)) {
    if (selection.front_file) {
      form.set("file", selection.front_file, selection.front_file.name);
    }
    // Omitted entirely when absent — an optional back side must not be sent as
    // an empty part, which Laravel would fail as an invalid file rather than
    // read as "not provided".
    if (selection.back_file) {
      form.set("back_file", selection.back_file, selection.back_file.name);
    }
  } else if (selection.file) {
    form.set("file", selection.file, selection.file.name);
  }

  return form;
}

export function createDocument(
  requestId: number | string,
  input: DocumentInput,
  selection: DocumentFileSelection,
): Promise<MutationResult> {
  // A document with no scan is not a document, and the API may or may not
  // enforce that itself.
  const missing = missingDocumentFiles(input.document_type, selection);
  if (missing.length) throw new DocumentFileRequiredError(missing);

  return privateApiClient.mutate(
    "POST",
    basePath(requestId),
    buildForm(input, selection),
    { silent: true },
  );
}

/**
 * `POST …/documents/{docId}` with `_method=PATCH`.
 *
 * The same PHP constraint the sibling services document: `$_FILES` is not
 * populated for a multipart PUT/PATCH body, and the scans have to ride along —
 * so the request goes out as a POST carrying the real verb in `_method`.
 *
 * PATCH, not PUT: this matches the route the API exposes and the spoof
 * `consignment-boxes.service.ts` already uses for its own sub-resource updates.
 * The profile's `kycdocuments` resource is a PUT — a different endpoint under
 * different ownership, which is part of why these two services are separate.
 *
 * `stored` is the record as it currently exists; any slot the user left alone
 * is re-sent from it, so a text-only edit needs no file picking.
 */
export async function updateDocument(
  requestId: number | string,
  docId: number,
  input: DocumentInput,
  selection: DocumentFileSelection,
  stored: { file_path?: string | null; back_file_path?: string | null },
): Promise<MutationResult> {
  const hydrated = await hydrateSelection(
    input.document_type,
    selection,
    stored,
  );

  const missing = missingDocumentFiles(input.document_type, hydrated);
  if (missing.length) throw new DocumentFileRequiredError(missing);

  const form = buildForm(input, hydrated);
  form.set("_method", "PATCH");

  return privateApiClient.mutate("POST", docPath(requestId, docId), form, {
    silent: true,
  });
}

export function deleteDocument(
  requestId: number | string,
  docId: number,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "DELETE",
    docPath(requestId, docId),
    undefined,
    { silent: true },
  );
}
