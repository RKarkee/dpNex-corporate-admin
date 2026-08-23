/**
 * Domain types for the documents attached to one consignment request.
 *
 * **Deliberately a standalone copy of the profile/KYC types, not an import.**
 * The two resources happen to share a shape today — same fields, same statuses,
 * same two-sided file rule — but they are different endpoints owned by
 * different parts of the API, and a shared union would mean a change to one
 * silently rewrites the other. Duplication here is the cheaper mistake.
 *
 * If they are still identical in six months, that is the moment to extract a
 * shared module on purpose. Not before.
 */

export const DOCUMENT_TYPES = [
  "CITIZENSHIP",
  "PASSPORT",
  "NID",
  "COMPANY_REGISTRATION",
  "PAN",
  "VAT",
  "DRIVING_LICENSE",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RE_PROCESS",
  "EXPIRED",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface ConsignmentDocument {
  id: number;
  document_type: DocumentType;
  document_number: string;
  /**
   * Free text the *user* writes about this document.
   *
   * This replaces the earlier `remarks` field rather than sitting beside it, so
   * there is exactly one note on a document and it is editable. Anything the
   * old read-only reviewer banner used to show now lives here.
   */
  notes?: string | null;
  status: DocumentStatus;
  /**
   * References to the stored scans — authenticated endpoints, not public URLs.
   * Resolve with `useFileUrl` before putting either in an `<img src>`.
   *
   * `file_path` is the front side of a two-sided document and the only scan of
   * every other type; `back_file_path` is the reverse. They are written back as
   * `file` and `back_file` — see `buildForm`.
   */
  file_path?: string | null;
  back_file_path?: string | null;
}

/* -------------------------------------------------------------------------- */
/* File rules                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Two-sided documents — the ones the form renders as two upload slots.
 *
 * **This is the one function to edit** when the set of two-sided consignment
 * document types is confirmed. Everything downstream — how many slots render,
 * which payload keys are set, which side a validation error lands on — reads
 * this and `documentBackRequired` rather than testing types itself.
 *
 * Seeded from the KYC rule because that is the only confirmed example of the
 * API's two-sided behaviour.
 */
export function documentRequiresFrontBack(type: DocumentType): boolean {
  return type === "CITIZENSHIP" || type === "NID";
}

/**
 * Whether the back side is *mandatory*, as opposed to merely offered.
 *
 * Narrower than `documentRequiresFrontBack` on purpose: a type can render a
 * back slot and send it when filled while still saving without it.
 */
export function documentBackRequired(type: DocumentType): boolean {
  return type === "CITIZENSHIP";
}

/**
 * No expiry rules here, and no expiry field at all.
 *
 * The profile's KYC documents carry an expiry date and force one on passports
 * and licences. Consignment paperwork does not track expiry for now, so there is
 * neither a field nor a predicate — a document is identified by its type and
 * number, described by its notes, and evidenced by its scans.
 */

/* -------------------------------------------------------------------------- */
/* Narrowing helpers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The API is untrusted: a `document_type` the frontend has never heard of must
 * not flow into a `Record<DocumentType, …>` lookup and yield `undefined` at
 * render time. Unknown values are coerced at the service boundary instead.
 */

export function isDocumentType(value: unknown): value is DocumentType {
  return (
    typeof value === "string" &&
    (DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}

export function isDocumentStatus(value: unknown): value is DocumentStatus {
  return (
    typeof value === "string" &&
    (DOCUMENT_STATUSES as readonly string[]).includes(value)
  );
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Fallbacks only. `GET /meta` is the real source for document-type copy; these
 * cover the window before it lands and any key meta omits.
 */
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  CITIZENSHIP: "Citizenship",
  PASSPORT: "Passport",
  NID: "National ID",
  COMPANY_REGISTRATION: "Company registration",
  PAN: "PAN",
  VAT: "VAT",
  DRIVING_LICENSE: "Driving licence",
};

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type];
}

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RE_PROCESS: "Re-processing",
  EXPIRED: "Expired",
};

export function documentStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABELS[status];
}

/**
 * The `GET /meta` control these labels come from.
 *
 * A named constant because it is a guess: the consignment resource may publish
 * its own control or reuse the KYC one. If the dropdown shows raw keys, this is
 * the line to change — the static union above keeps the UI working meanwhile.
 */
export const DOCUMENT_TYPE_META_CONTROL = "consignment_document_type";
