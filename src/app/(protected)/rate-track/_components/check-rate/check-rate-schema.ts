import { z } from "zod";

import type { CheckRatesInput } from "../../types";

/**
 * Validation for the standalone rate-check form — the customer portal's rules.
 *
 * Only the country is required. State, city, ZIP, the address lines, package
 * type and item type narrow the answer but the API does not insist on them.
 * Weight is either one total or a list of boxes — never neither — so which is
 * required depends on `mode`, and `superRefine` is where that lives.
 *
 * Every number is held as a string: an empty box would coerce to `0` and read
 * as a real weight, so text is kept until the payload is built.
 */

export const DIMENSIONS = ["length", "width", "height", "weight"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

const boxSchema = z.object({
  length: z.string(),
  width: z.string(),
  height: z.string(),
  weight: z.string(),
});

export const checkRatesSchema = z
  .object({
    receiver_country: z.string().length(2, "Choose a country"),
    receiver_state: z.string().max(60, "Keep this under 60 characters").optional(),
    /** The readable name `LocationFields` mirrors alongside the code. Not sent. */
    receiver_state_name: z.string().optional(),
    receiver_city: z.string().max(60, "Keep this under 60 characters").optional(),
    receiver_zip: z.string().max(20, "Keep this under 20 characters").optional(),
    receiver_address_1: z.string().max(150, "Keep this under 150 characters").optional(),
    receiver_address_2: z.string().max(150, "Keep this under 150 characters").optional(),
    package_type: z.string().optional(),
    // Optional and deliberately not pre-selected: the user chooses what they
    // are shipping themselves — same as the consignment request rate check.
    item_type: z.string().optional(),
    mode: z.enum(["weight", "boxes"]),
    total_weight: z.string().optional(),
    boxes: z.array(boxSchema),
  })
  .superRefine((value, ctx) => {
    const positive = (text?: string) => {
      const n = Number(text);
      return text?.trim() !== "" && Number.isFinite(n) && n > 0;
    };

    if (value.mode === "weight") {
      if (!positive(value.total_weight)) {
        ctx.addIssue({
          code: "custom",
          path: ["total_weight"],
          message: "Enter a weight greater than 0",
        });
      }
      return;
    }

    if (value.boxes.length === 0) {
      ctx.addIssue({ code: "custom", path: ["boxes"], message: "Add at least one box" });
      return;
    }

    value.boxes.forEach((box, index) => {
      for (const key of DIMENSIONS) {
        if (!positive(box[key])) {
          ctx.addIssue({
            code: "custom",
            path: ["boxes", index, key],
            message: "Must be greater than 0",
          });
        }
      }
    });
  });

export type CheckRatesFormValues = z.infer<typeof checkRatesSchema>;

export const EMPTY_BOX = { length: "", width: "", height: "", weight: "" };

export const CHECK_RATES_DEFAULTS: CheckRatesFormValues = {
  receiver_country: "",
  receiver_state: "",
  receiver_state_name: "",
  receiver_city: "",
  receiver_zip: "",
  receiver_address_1: "",
  receiver_address_2: "",
  package_type: "",
  item_type: "",
  mode: "weight",
  total_weight: "",
  boxes: [],
};

/**
 * Form values → the wire body. Blank optionals are omitted rather than sent
 * as `""`, which the API would validate as a value.
 */
export function toCheckRatesInput(values: CheckRatesFormValues): CheckRatesInput {
  const text = (value?: string) => value?.trim() || undefined;

  return {
    receiver_country: values.receiver_country,
    receiver_state: text(values.receiver_state),
    receiver_city: text(values.receiver_city),
    receiver_zip: text(values.receiver_zip),
    receiver_address_1: text(values.receiver_address_1),
    receiver_address_2: text(values.receiver_address_2),
    package_type: text(values.package_type),
    item_type: text(values.item_type),
    ...(values.mode === "weight"
      ? { total_weight: Number(values.total_weight) }
      : {
          boxes: values.boxes.map((box) => ({
            length: Number(box.length),
            width: Number(box.width),
            height: Number(box.height),
            weight: Number(box.weight),
          })),
        }),
  };
}
