import type { CreateApprovalRequestPayload } from "./services/approval-request.service";
import { parseAmount, type ApprovalFormValues } from "./schema";
import { infoFieldsFor, type ApprovalPayload } from "./types";

/**
 * Form values → the body `POST /corporate/approval-requests` expects.
 *
 * Two rules the API cares about, both enforced here rather than in the form:
 *
 * **`subject_id` is only ever sent for `DISCOUNT`.** For the other three the
 * subject is the caller's own corporate or customer record, resolved from the
 * authenticated user; the docs allow sending it, but only if it matches — so
 * omitting it is strictly safer than passing an id the form guessed.
 *
 * **Update payloads carry only what changed.** Sending every whitelisted
 * attribute would turn "the accounts contact changed" into a twenty-line diff
 * for the reviewer, and would re-propose values nobody touched.
 */
export function buildCreatePayload(
  values: ApprovalFormValues,
): CreateApprovalRequestPayload {
  const reason = values.reason.trim();
  const base = reason ? { reason } : {};

  if (values.type === "CREDIT_LIMIT_INCREASE") {
    return {
      ...base,
      type: values.type,
      payload: { credit_limit: parseAmount(values.credit_limit) ?? 0 },
    };
  }

  if (values.type === "DISCOUNT") {
    return {
      ...base,
      type: values.type,
      subject_id: Number(values.subject_id),
      payload: {
        discount_type: values.discount_type,
        discount_value: parseAmount(values.discount_value) ?? 0,
      },
    };
  }

  const payload: ApprovalPayload = {};
  for (const field of infoFieldsFor(values.type)) {
    const value = (values.info[field.name] ?? "").trim();
    if (value) payload[field.name] = value;
  }

  return { ...base, type: values.type, payload };
}
