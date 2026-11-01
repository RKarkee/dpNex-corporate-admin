import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

/**
 * The restricted-item check.
 *
 * `POST /corporate/consignments/check-restricted-item`, carrying the value(s)
 * as query params — `item_name` when the name changed, `hs_code` when the code
 * changed, and `receiver_country` (the destination) which the endpoint
 * requires alongside them.
 *
 * The response shape isn't pinned down, so the parse is deliberately forgiving:
 * a restriction may arrive as a flag on a 2xx body or as a 4xx carrying a
 * message. A field-validation 422 (e.g. a receiver country not filled in yet)
 * is *not* a restriction and is swallowed, so a check that cannot run never
 * blocks the user or flashes "Data Validation Error".
 */

export interface RestrictedItemParams {
  item_name?: string;
  hs_code?: string;
  /** Destination country — required by the endpoint. */
  receiver_country?: string;
}

export interface RestrictedItemResult {
  restricted: boolean;
  message?: string;
}

export async function checkRestrictedItem(
  params: RestrictedItemParams,
): Promise<RestrictedItemResult> {
  const query: Record<string, string> = {};
  if (params.item_name?.trim()) query.item_name = params.item_name.trim();
  if (params.hs_code?.trim()) query.hs_code = params.hs_code.trim();
  // The trigger is a name or a code; nothing to check without one.
  if (!query.item_name && !query.hs_code) return { restricted: false };
  if (params.receiver_country?.trim())
    query.receiver_country = params.receiver_country.trim();

  try {
    const result = await privateApiClient.mutate<unknown>(
      "POST",
      "/corporate/consignments/check-restricted-item",
      null,
      // We render our own restriction message; suppress the automatic toast.
      { params: query, silent: true },
    );
    const body = (result?.data ?? {}) as Record<string, unknown>;
    const inner = (body.data ?? {}) as Record<string, unknown>;
    const flag =
      body.restricted ??
      inner.restricted ??
      body.is_restricted ??
      inner.is_restricted;
    const status = String(body.status ?? "").toLowerCase();
    const restricted =
      flag === true ||
      status === "error" ||
      status === "restricted" ||
      status === "fail";
    const message =
      (body.message as string | undefined) ??
      (inner.message as string | undefined) ??
      result.message;
    return {
      restricted: !!restricted,
      message: restricted ? message : undefined,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      // A field-keyed validation error (a missing required param such as
      // receiver_country) is not a restriction — stay quiet.
      if (
        error.isValidationError ||
        (error.fieldErrors && Object.keys(error.fieldErrors).length > 0)
      ) {
        return { restricted: false };
      }
      // Any other 4xx carrying a message is the API refusing the item.
      if (error.status >= 400 && error.status < 500 && error.message) {
        return { restricted: true, message: error.message };
      }
    }
    // Network / server errors must not block the form.
    return { restricted: false };
  }
}
