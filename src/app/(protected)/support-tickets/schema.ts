import { z } from "zod";

import {
  DEFAULT_TICKET_CATEGORY,
  DEFAULT_TICKET_PRIORITY,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
} from "./types";

/**
 * Validation for "raise a ticket".
 *
 * Subject and description are the only required fields; category and priority
 * have API defaults but are always sent, because a ticket filed as GENERAL /
 * MEDIUM by omission is indistinguishable from one deliberately filed that way
 * and the picker makes the choice cheap.
 *
 * The two lookups are pairs — `*_id` is sent, `*_label` is shown. The label is
 * carried in form state because the combobox trigger has to render something
 * before its list has been opened.
 */

export const SUBJECT_MAX = 200;
export const DESCRIPTION_MAX = 5000;

export const ticketSchema = z.object({
  subject: z
    .string()
    .min(1, "Give the ticket a subject")
    .max(SUBJECT_MAX, `Must be ${SUBJECT_MAX} characters or fewer`),
  description: z
    .string()
    .min(1, "Describe what went wrong")
    .max(DESCRIPTION_MAX, `Must be ${DESCRIPTION_MAX} characters or fewer`),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),

  consignment_id: z.string(),
  consignment_label: z.string(),
  customer_id: z.string(),
  customer_label: z.string(),
});

export type TicketFormValues = z.infer<typeof ticketSchema>;

/**
 * A blank form.
 *
 * Every key is present from the start — react-hook-form treats a field that
 * appears later as uncontrolled, and the input would warn on first keystroke.
 */
export function emptyTicketForm(): TicketFormValues {
  return {
    subject: "",
    description: "",
    category: DEFAULT_TICKET_CATEGORY,
    priority: DEFAULT_TICKET_PRIORITY,
    consignment_id: "",
    consignment_label: "",
    customer_id: "",
    customer_label: "",
  };
}
