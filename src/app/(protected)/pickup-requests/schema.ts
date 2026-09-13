import { z } from "zod";

import { DEFAULT_VEHICLE_TYPE, VEHICLE_TYPES } from "./types";

/**
 * Validation for booking a pickup.
 *
 * The three rules the API actually enforces — every consignment request must
 * belong to the same customer or corporate, none may already be collected, and
 * none may sit on another still-open pickup — are not checkable from here. They
 * depend on rows this app cannot see, and a guess would either block a valid
 * booking or promise one the server refuses. So the form validates shape only
 * and shows the server's refusal verbatim.
 */

export const REMARKS_MAX = 1000;

export const pickupSchema = z.object({
  /** Ids as strings, because that is what the picker and the URL deal in. */
  consignment_request_ids: z
    .array(z.string())
    .min(1, "Choose at least one consignment request"),
  pickup_date: z.string().min(1, "Choose the pickup date"),
  /** `H:i`. Optional — a date with no time is a valid booking. */
  pickup_time: z.string(),
  vehicle_type: z.enum(VEHICLE_TYPES),
  remarks: z
    .string()
    .max(REMARKS_MAX, `Must be ${REMARKS_MAX} characters or fewer`),
});

export type PickupFormValues = z.infer<typeof pickupSchema>;

/** The label for each picked id, kept beside the form rather than inside it. */
export interface PickedConsignment {
  value: string;
  label: string;
}

export function emptyPickupForm(): PickupFormValues {
  return {
    consignment_request_ids: [],
    pickup_date: "",
    pickup_time: "",
    vehicle_type: DEFAULT_VEHICLE_TYPE,
    remarks: "",
  };
}
