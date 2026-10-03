import { z } from "zod";

/**
 * The rate-check form: destination, package and the boxes being priced.
 *
 * Kept apart from the view so the boxes component can share its types without
 * importing the page that renders it.
 */

/** Weight and every dimension must be a real, positive measurement. */
const positiveMeasure = (label: string) =>
  z.coerce.number().positive(`${label} must be greater than 0`);

export const rateCheckBoxSchema = z.object({
  weight: positiveMeasure("Weight"),
  length: positiveMeasure("Length"),
  width: positiveMeasure("Width"),
  height: positiveMeasure("Height"),
});

export const checkRatesSchema = z.object({
  receiver_country: z.string().min(1, "Country is required"),
  receiver_state: z.string().min(1, "State is required"),
  receiver_state_name: z.string().optional(),
  receiver_city: z.string().min(1, "City is required"),
  receiver_zip: z.string().min(1, "ZIP / postal code is required"),
  // Optional — priced on the city and ZIP, but carried on to the create step.
  receiver_address_1: z.string().optional(),
  receiver_address_2: z.string().optional(),
  package_type: z.string().min(1, "Package type is required"),
  // Optional, and deliberately not pre-selected: `/meta` publishes a default,
  // but the user has to choose what they are shipping themselves.
  item_type: z.string().optional(),
  boxes: z.array(rateCheckBoxSchema).min(1, "Add at least one box"),
});

/**
 * The box measures are coerced, so the form holds strings where the validated
 * result holds numbers — hence two types rather than one. See the note in
 * `schema.ts`.
 */
export type CheckRatesFormInput = z.input<typeof checkRatesSchema>;
export type CheckRatesFormValues = z.output<typeof checkRatesSchema>;

export const RATE_CHECK_BOX_FIELDS = [
  { name: "weight", label: "Weight (kg)" },
  { name: "length", label: "Length (cm)" },
  { name: "width", label: "Width (cm)" },
  { name: "height", label: "Height (cm)" },
] as const;

export const newRateCheckBox: CheckRatesFormInput["boxes"][number] = {
  weight: "",
  length: "",
  width: "",
  height: "",
};

/**
 * The total the API is sent: the boxes' summed weight. Rounded to three
 * places so float noise (0.1 + 0.2) never reaches the payload or the screen.
 * Blank or invalid weights count as nothing.
 */
export function sumBoxWeights(boxes: ReadonlyArray<{ weight?: unknown }> | undefined): number {
  const total = (boxes ?? []).reduce((sum, box) => {
    const weight = Number(box?.weight);
    return Number.isFinite(weight) && weight > 0 ? sum + weight : sum;
  }, 0);
  return Math.round(total * 1000) / 1000;
}
