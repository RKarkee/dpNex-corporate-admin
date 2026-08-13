/**
 * Domain types for the corporate customer profile and its KYC documents.
 *
 * These are the *normalised* shapes — what the services hand upward. Nothing
 * here mirrors an API envelope; that translation lives in `services/`, and no
 * component ever learns whether the payload arrived under `data.customer` or
 * `data.users`.
 */

import type { Corporate } from "@/shared/auth/types";

/** Where an address applies. The API stores the bare key. */
export const ADDRESS_TYPES = [
  "REGISTERED",
  "PERMANENT",
  "CURRENT",
  "MAILING",
  "BILLING",
  "WORK",
  "RESIDENT",
] as const;

export type AddressType = (typeof ADDRESS_TYPES)[number];

/** The API's boolean-as-string, shared with `User.disabled`. */
export type YesNo = "Y" | "N";

export interface Address {
  /** Absent on a row the user has just added; present means "update this one". */
  id?: number;
  type?: AddressType;
  /** iso2 code — what `LocationFields` stores and the API expects. */
  country: string;
  /**
   * A code (`"P3"`), not a name. The wire carries no `state_name` at all —
   * `LocationFields` derives it, and `resolveStateValue` normalises whatever
   * arrives before the form is seeded.
   */
  state?: string;
  state_name?: string;
  city: string;
  address_line_1: string;
  address_line_2?: string;
  zip: string;
  email?: string;
  phone_1?: string;
  phone_2?: string;
  telephone_1?: string;
  telephone_1_ext?: string;
  telephone_2?: string;
  telephone_2_ext?: string;
  is_primary: YesNo;

  /**
   * Validity window and note. Nothing in this UI edits them, but they are read
   * back and carried through the payload untouched — dropping them on save
   * would silently clear whatever the API had stored.
   */
  effective_from?: string | null;
  effective_to?: string | null;
  remarks?: string | null;
}

/**
 * The customer record behind the signed-in corporate user.
 *
 * `addresses` is always an array — the service defaults a missing or null key
 * to `[]` so no component has to guard it. `id` is the create-vs-update
 * discriminant and is never inferred from field contents.
 */
export interface CustomerProfile {
  id: number;
  name: string;
  /** `CUSTOMER`; `customer_type` is `CORPORATE` for this portal's accounts. */
  type?: string | null;
  customer_type?: string | null;
  notes?: string | null;
  phone_1?: string | null;
  phone_2?: string | null;
  telephone_1?: string | null;
  telephone_1_ext?: string | null;
  telephone_2?: string | null;
  telephone_2_ext?: string | null;
  /** Admin-authored note asking the user to fix something. Rendered as a banner. */
  remarks?: string | null;
  kyc_remarks?: string | null;
  /** The rolled-up status the header badge shows; absent until a document exists. */
  kyc_status?: KycStatus | null;

  /**
   * The company, nested inside the customer record.
   *
   * The same `Corporate` the session carries, so the header can show
   * `corp_code`, PAN/VAT and the company KYC status without a second request.
   * Reusing the shared type rather than declaring a second one keeps the two
   * sources of the same entity from drifting.
   */
  corporate?: Corporate | null;

  addresses: Address[];
}

/* -------------------------------------------------------------------------- */
/* KYC                                                                        */
/* -------------------------------------------------------------------------- */

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

export const KYC_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RE_PROCESS",
  "EXPIRED",
] as const;

export type KycStatus = (typeof KYC_STATUSES)[number];

export interface KycDocument {
  id: number;
  document_type: DocumentType;
  document_number: string;
  issue_date: string;
  expiry_date?: string | null;
  /** iso2 code of the issuing country. */
  issued_country: string;
  issued_by?: string | null;
  issued_place?: string | null;
  status: KycStatus;
  /**
   * References to the stored scans — authenticated endpoints, not public URLs.
   * Resolve with `useFileUrl` before putting either in an `<img src>`.
   */
  file_path?: string | null;
  back_file_path?: string | null;
  /** Reviewer's note on a rejection. */
  remarks?: string | null;
}

/**
 * Two-sided documents. A citizenship certificate is printed front and back and
 * the API stores the sides separately; everything else is a single scan.
 */
export function kycRequiresFrontBack(type: DocumentType): boolean {
  return type === "CITIZENSHIP";
}

/** Only the documents that actually carry an expiry date on them. */
export function kycRequiresExpiry(type: DocumentType): boolean {
  return type === "PASSPORT" || type === "DRIVING_LICENSE";
}

/* -------------------------------------------------------------------------- */
/* Narrowing helpers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * These exist because the API is untrusted: a `document_type` the frontend has
 * never heard of must not flow into a `Record<DocumentType, …>` lookup and
 * yield `undefined` at render time. Unknown values are coerced to a safe
 * default at the service boundary instead.
 */

export function isDocumentType(value: unknown): value is DocumentType {
  return (
    typeof value === "string" &&
    (DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}

export function isKycStatus(value: unknown): value is KycStatus {
  return (
    typeof value === "string" &&
    (KYC_STATUSES as readonly string[]).includes(value)
  );
}

export function isAddressType(value: unknown): value is AddressType {
  return (
    typeof value === "string" &&
    (ADDRESS_TYPES as readonly string[]).includes(value)
  );
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Fallbacks only. `GET /meta` is the real source for document-type copy
 * (`controls.kyc_document_type.values`); these cover the window before it
 * lands and any key meta omits.
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

const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RE_PROCESS: "Re-processing",
  EXPIRED: "Expired",
};

export function kycStatusLabel(status: KycStatus): string {
  return KYC_STATUS_LABELS[status];
}

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  REGISTERED: "Registered",
  PERMANENT: "Permanent",
  CURRENT: "Current",
  MAILING: "Mailing",
  BILLING: "Billing",
  WORK: "Work",
  RESIDENT: "Resident",
};

export function addressTypeLabel(type: AddressType): string {
  return ADDRESS_TYPE_LABELS[type];
}
