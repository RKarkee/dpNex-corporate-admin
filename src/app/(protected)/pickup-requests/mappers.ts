import type { PickupFormValues } from "./schema";
import type { CreatePickupPayload } from "./services/pickup-request.service";

/**
 * Form values → the body `POST /corporate/pickuprequests` expects.
 *
 * Ids go back to numbers, the time is trimmed to `H:i` — the API documents that
 * format on the way in even though it answers with `14:30:00` — and empty
 * optional fields are omitted rather than sent blank.
 */
export function buildCreatePayload(
  values: PickupFormValues,
): CreatePickupPayload {
  const payload: CreatePickupPayload = {
    consignment_request_ids: values.consignment_request_ids.map(Number),
    pickup_date: values.pickup_date,
    vehicle_type: values.vehicle_type,
  };

  const time = values.pickup_time.trim().slice(0, 5);
  if (time) payload.pickup_time = time;

  const remarks = values.remarks.trim();
  if (remarks) payload.remarks = remarks;

  return payload;
}
