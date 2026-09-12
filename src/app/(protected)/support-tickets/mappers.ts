import type { TicketFormValues } from "./schema";
import type { CreateTicketPayload } from "./services/support-ticket.service";

/**
 * Form values → the body `POST /corporate/supporttickets` expects.
 *
 * `corporate_id` is never sent. The docs are explicit that on the corporate
 * endpoints it is taken from the authenticated session and cannot be
 * overridden, so including it could only ever be ignored or rejected.
 *
 * The two optional ids are omitted rather than sent empty: the API validates
 * them as existing rows, and `""` is not one.
 */
export function buildCreatePayload(
  values: TicketFormValues,
): CreateTicketPayload {
  const payload: CreateTicketPayload = {
    subject: values.subject.trim(),
    description: values.description.trim(),
    category: values.category,
    priority: values.priority,
  };

  if (values.consignment_id.trim()) {
    payload.consignment_id = Number(values.consignment_id);
  }
  if (values.customer_id.trim()) {
    payload.customer_id = Number(values.customer_id);
  }

  return payload;
}
