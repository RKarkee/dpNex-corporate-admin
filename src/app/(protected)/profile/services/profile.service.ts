import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import { IS_DEV } from "@/shared/config/env";

import type { Address, CustomerProfile } from "../types";
import { isAddressType, isKycStatus } from "../types";

/**
 * `GET/POST/PUT /corporate/profile` — the customer record behind the signed-in
 * corporate user, with its addresses nested inside.
 *
 * This file owns every piece of knowledge about the API's envelope. Callers
 * receive `CustomerProfile | null` and nothing else.
 *
 * **Unverified contract.** The envelope keys below were not confirmed against a
 * live corporate response — the read probe has not been run yet. They are drawn
 * from the sibling customer app (`../logistic-cargo-web-app`, which calls the
 * same resource under `/external/profile` and nests the record at
 * `data.users.customer`) and from the neighbouring `users.service.ts`. If the
 * real shape differs, `readProfile` is the only function that changes.
 *
 * No `corporate_id` is ever sent: `X-Corporate-Code` already scopes the call,
 * and passing one would let a typo target another corporate.
 */

const PROFILE_PATH = "/corporate/profile";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The three outcomes a read can have, kept apart on purpose.
 *
 * `absent` and `unreadable` must never collapse into each other. "No profile"
 * puts the form into *create* mode, so treating a parse failure as absent would
 * invite the user to create a duplicate of a profile they already have, and
 * would present a backend regression as though it were their own missing data.
 *
 * `unreadable` still renders the full page — it is not an error screen — but it
 * carries the keys that were actually present so the notice can say something
 * useful, and it holds the create path back.
 */
export type ProfileRead =
  | { kind: "found"; profile: CustomerProfile }
  | { kind: "absent" }
  | { kind: "unreadable"; keys: string[] };

/** Reads `wrapper.customer` when the payload nests the record under a user. */
function nested(value: unknown): unknown {
  return isRecord(value) ? value.customer : undefined;
}

/**
 * Locates the customer record.
 *
 * The candidate list is **exhaustive and explicit**. There is deliberately no
 * "find any object that looks like a profile" fallback: on this very payload
 * `customers.corporate` also has a numeric `id` and a `name`, so a heuristic
 * could bind the *company* to the profile form and render it as the customer.
 * A confidently wrong answer is worse than a blank form with a warning.
 *
 * Both depths are covered because `extractData` only peels the envelope when
 * the body carries *both* `data` and `status` — an endpoint that omits `status`
 * arrives here unpeeled.
 *
 * `customers` comes first because that is what `/corporate/profile` returns:
 * a plural key holding a single record, the same quirk `data.users` and
 * `/corporate/roles/{id}` have.
 */
function readProfile(raw: unknown): ProfileRead {
  if (raw === null || raw === undefined) return { kind: "absent" };
  if (!isRecord(raw)) return { kind: "unreadable", keys: [] };

  const data = isRecord(raw.data) ? raw.data : undefined;

  const candidates: unknown[] = [
    // Peeled — what this portal actually receives.
    raw.customers,
    raw.customer,
    nested(raw.users),
    nested(raw.user),
    raw.profile,
    // Unpeeled, same order.
    data?.customers,
    data?.customer,
    nested(data?.users),
    nested(data?.user),
    data?.profile,
  ];

  for (const candidate of candidates) {
    // An explicit null under a key we recognise is the API saying "none yet".
    if (candidate === null) return { kind: "absent" };
    if (isRecord(candidate) && typeof candidate.id === "number") {
      return { kind: "found", profile: normalizeProfile(candidate) };
    }
  }

  // Never fall back to `raw` or to a `users` wrapper: both carry an `id` of
  // their own and would render the wrong entity as the profile.
  return { kind: "unreadable", keys: Object.keys(raw) };
}

/**
 * Dev-only, and **keys only** — the values could be personal data and the
 * console is not the place for it.
 *
 * This is what turns an unreadable payload into an actionable report: one
 * reload names the keys the API actually sent, which is exactly what was needed
 * to find that the record sits under `customers` rather than `customer`.
 */
function logUnreadable(raw: unknown): void {
  if (!IS_DEV || typeof window === "undefined") return;

  console.debug(
    "[profile] unrecognised envelope. Top-level keys:",
    isRecord(raw) ? Object.keys(raw) : typeof raw,
    isRecord(raw) && isRecord(raw.data) ? { "data.*": Object.keys(raw.data) } : "",
  );
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeProfile(record: Record<string, unknown>): CustomerProfile {
  return {
    id: record.id as number,
    name: str(record.name),
    type: optionalStr(record.type),
    customer_type: optionalStr(record.customer_type),
    notes: optionalStr(record.notes),
    phone_1: optionalStr(record.phone_1),
    phone_2: optionalStr(record.phone_2),
    telephone_1: optionalStr(record.telephone_1),
    telephone_1_ext: optionalStr(record.telephone_1_ext),
    telephone_2: optionalStr(record.telephone_2),
    telephone_2_ext: optionalStr(record.telephone_2_ext),
    remarks: optionalStr(record.remarks),
    kyc_remarks: optionalStr(record.kyc_remarks),
    kyc_status: isKycStatus(record.kyc_status) ? record.kyc_status : null,
    // Structurally the shared `Corporate`, whose every field past the first two
    // is optional — so a partial company block narrows cleanly rather than
    // needing its own reader.
    corporate: isRecord(record.corporate)
      ? (record.corporate as unknown as CustomerProfile["corporate"])
      : null,
    // Always an array. A missing or null key is "no addresses", not a shape
    // failure — the record itself was recognised, so this stays tolerant.
    addresses: readAddresses(record.addresses),
  };
}

function readAddresses(value: unknown): Address[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((row) => ({
    id: typeof row.id === "number" ? row.id : undefined,
    type: isAddressType(row.type) ? row.type : undefined,
    country: str(row.country),
    state: str(row.state),
    state_name: str(row.state_name),
    city: str(row.city),
    address_line_1: str(row.address_line_1),
    address_line_2: str(row.address_line_2),
    zip: str(row.zip),
    email: str(row.email),
    phone_1: str(row.phone_1),
    phone_2: str(row.phone_2),
    telephone_1: str(row.telephone_1),
    telephone_1_ext: str(row.telephone_1_ext),
    telephone_2: str(row.telephone_2),
    telephone_2_ext: str(row.telephone_2_ext),
    is_primary: row.is_primary === "Y" ? "Y" : "N",
    // Read back and carried through untouched. Nothing edits them, but
    // dropping them from the payload would clear what the API had stored.
    effective_from: optionalStr(row.effective_from),
    effective_to: optionalStr(row.effective_to),
    remarks: optionalStr(row.remarks),
  }));
}

/**
 * The customer profile behind the signed-in corporate user.
 *
 * Returns a `ProfileRead` rather than throwing on an unrecognised body: the
 * page must render either way, and only the *presentation* of a parse failure
 * differs from a genuine absence. A transport failure (network, 401, 500) still
 * throws — that is a different problem with a different remedy.
 *
 * A 404 counts as `absent`; some Laravel resources answer "nothing here" with a
 * status rather than a null body.
 */
export async function fetchProfile(signal?: AbortSignal): Promise<ProfileRead> {
  let raw: unknown;

  try {
    raw = await privateApiClient.get<unknown>(PROFILE_PATH, {
      // The page renders its own surfaces; the interceptor's toast would
      // double up.
      silent: true,
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { kind: "absent" };
    throw error;
  }

  const result = readProfile(raw);
  if (result.kind === "unreadable") logUnreadable(raw);

  return result;
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export interface ProfileAddressPayload {
  id?: number;
  type?: string;
  country: string;
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
  is_primary: string;
}

export interface ProfilePayload {
  name: string;
  notes?: string;
  phone_1: string;
  phone_2?: string;
  telephone_1?: string;
  telephone_1_ext?: string;
  telephone_2?: string;
  telephone_2_ext?: string;
  addresses: ProfileAddressPayload[];
}

/**
 * Sent as JSON, not `FormData`.
 *
 * The multipart dance `users.service.ts` performs exists only because a photo
 * rides along with those writes. Nothing here is a file, and the nested
 * `addresses` array survives a JSON body intact where it would need
 * `addresses[0][city]` bracket-encoding as multipart.
 */
export function createProfile(payload: ProfilePayload): Promise<MutationResult> {
  return privateApiClient.mutate("POST", PROFILE_PATH, payload, {
    // The form maps 422 field errors onto its own inputs.
    silent: true,
  });
}

export function updateProfile(payload: ProfilePayload): Promise<MutationResult> {
  return privateApiClient.mutate("PUT", PROFILE_PATH, payload, {
    silent: true,
  });
}
