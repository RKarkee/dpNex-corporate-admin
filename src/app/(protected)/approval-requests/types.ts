/**
 * Approval requests — what the caller asks someone else to agree to.
 *
 * Four kinds share one record: a credit-limit rise, a discount on a
 * consignment, and updates to the corporate or the personal profile. What
 * distinguishes them is `type` and the free-form `payload` it implies, so
 * every renderer in this slice switches on `type` and reads `payload`
 * defensively — the server whitelists what it applies, and can add keys.
 */

export const APPROVAL_TYPES = [
  "CREDIT_LIMIT_INCREASE",
  "DISCOUNT",
  "CORPORATE_INFO_UPDATE",
  "PROFILE_UPDATE",
] as const;

export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const DISCOUNT_TYPES = ["FIXED", "PERCENTAGE"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** `/meta`'s default for a new request, per `approval_request_types.default`. */
export const DEFAULT_APPROVAL_TYPE: ApprovalType = "CORPORATE_INFO_UPDATE";

/** `/meta`'s default queue, per `approval_statuses.default`. */
export const DEFAULT_APPROVAL_STATUS: ApprovalStatus = "PENDING";

/**
 * The proposed change.
 *
 * Typed keys for the two numeric kinds, then anything else — the update types
 * carry whichever profile attributes were actually edited, and listing them
 * here as required fields would be a lie about a payload that is by design
 * partial.
 */
export interface ApprovalPayload {
  credit_limit?: number | string;
  discount_type?: DiscountType | string;
  discount_value?: number | string;
  [key: string]: unknown;
}

export interface ApprovalRequest {
  id: number;
  request_no: string;
  type: ApprovalType | string;
  /** The server's own wording. Preferred over anything derived locally. */
  type_label?: string | null;
  status: ApprovalStatus | string;
  status_label?: string | null;
  /** `Corporate`, `Customer`, `Consignment` — what the request is about. */
  subject_type?: string | null;
  subject_id?: number | null;
  payload?: ApprovalPayload | null;
  reason?: string | null;
  review_remarks?: string | null;
  requested_by?: number | null;
  requested_by_name?: string | null;
  requested_at?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  /** Set once an approved change has actually been written to the record. */
  applied_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Only a pending request can be withdrawn; everything else is already decided. */
export function isCancellable(request: ApprovalRequest): boolean {
  return String(request.status).toUpperCase() === "PENDING";
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Every query parameter the list endpoint documents, as strings.
 *
 * Strings throughout because this object is the URL: a blank value means "not
 * filtering by this", and `""` round-trips through `URLSearchParams` without
 * the `0`/`NaN` ambiguity a number would bring.
 *
 * `corporate_id`, `customer_id` and the two `reviewed_*` bounds are documented
 * as review-queue parameters and are ignored by the self-scoped portal list.
 * They are here because the same controller serves both, and this bar is what
 * the review queue will reuse — the API dropping them is harmless.
 */
export interface ApprovalFilterValues {
  q: string;
  status: string;
  type: string;
  corporate_id: string;
  customer_id: string;
  requested_from: string;
  requested_to: string;
  reviewed_from: string;
  reviewed_to: string;
}

/* -------------------------------------------------------------------------- */
/* The update whitelist                                                       */
/* -------------------------------------------------------------------------- */

export interface InfoField {
  name: string;
  label: string;
  /** Mirrors the API's own limit, so a 422 is caught before the request. */
  maxLength: number;
  kind?: "text" | "email" | "textarea";
  /** `default_currency` is exactly three characters, not "up to three". */
  exactLength?: number;
  hint?: string;
}

/**
 * The attributes a `CORPORATE_INFO_UPDATE` may propose.
 *
 * Exactly the keys the API whitelists, with its own lengths. Anything outside
 * this list is discarded on approval, so offering a field that is not here
 * would let someone write a request that silently does nothing.
 */
export const CORPORATE_INFO_FIELDS: InfoField[] = [
  { name: "name", label: "Name", maxLength: 255 },
  { name: "registered_name", label: "Registered name", maxLength: 255 },
  { name: "registration_number", label: "Registration number", maxLength: 100 },
  { name: "pan", label: "PAN", maxLength: 50 },
  { name: "vat", label: "VAT", maxLength: 50 },
  { name: "con_person_name", label: "Contact person", maxLength: 255 },
  {
    name: "con_person_designation",
    label: "Contact designation",
    maxLength: 255,
  },
  {
    name: "con_person_email",
    label: "Contact email",
    maxLength: 255,
    kind: "email",
  },
  { name: "con_person_phone", label: "Contact phone", maxLength: 50 },
  { name: "con_person_telephone", label: "Contact telephone", maxLength: 50 },
  {
    name: "con_person_telephone_ext",
    label: "Telephone extension",
    maxLength: 20,
  },
  {
    name: "default_currency",
    label: "Default currency",
    maxLength: 3,
    exactLength: 3,
    hint: "Three-letter code, e.g. NPR",
  },
  { name: "phone_1", label: "Phone 1", maxLength: 50 },
  { name: "phone_2", label: "Phone 2", maxLength: 50 },
  { name: "telephone_1", label: "Telephone 1", maxLength: 50 },
  { name: "telephone_2", label: "Telephone 2", maxLength: 50 },
  { name: "notes", label: "Notes", maxLength: 2000, kind: "textarea" },
];

/**
 * The attributes a `PROFILE_UPDATE` may propose.
 *
 * The API validates both update types against the same whitelist, but a person
 * has no VAT number or registered name — offering those under "Profile update"
 * invites a request no reviewer can act on. Narrowed to the keys that describe
 * a person and their contact details.
 */
export const PROFILE_INFO_FIELDS: InfoField[] = CORPORATE_INFO_FIELDS.filter(
  (field) =>
    [
      "name",
      "con_person_name",
      "con_person_designation",
      "con_person_email",
      "con_person_phone",
      "con_person_telephone",
      "con_person_telephone_ext",
      "phone_1",
      "phone_2",
      "telephone_1",
      "telephone_2",
      "notes",
    ].includes(field.name),
);

export function infoFieldsFor(type: ApprovalType | string): InfoField[] {
  if (type === "CORPORATE_INFO_UPDATE") return CORPORATE_INFO_FIELDS;
  if (type === "PROFILE_UPDATE") return PROFILE_INFO_FIELDS;
  return [];
}

/** The readable name for a payload key, falling back to the key itself. */
export function infoFieldLabel(key: string): string {
  const known = CORPORATE_INFO_FIELDS.find((field) => field.name === key);
  if (known) return known.label;

  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
