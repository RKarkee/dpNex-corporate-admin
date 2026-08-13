import { z } from "zod";

import { PARTY_ADDRESS_TYPES, YES_NO } from "./types";

/**
 * Validation for the consignment form — one schema, shared by create and edit.
 *
 * Two things it does that are not obvious from the field list:
 *
 * **The form is nested where the API is flat.** `sender.first_name` here
 * becomes `sender_first_name` on the wire. Nesting is what makes the party
 * fields reusable between sender and receiver, and what lets one `AddressFields`
 * component serve both. The mappers own the translation.
 *
 * **Every async-lookup field is a pair.** `hs_code` holds the code that is
 * sent; `hs_code_label` holds the name that is shown. The label is carried in
 * form state because the trigger has to render something before — or without —
 * the list that would resolve it, which is exactly the situation an edit form
 * opens in. Labels are never submitted.
 */

/**
 * A number field that may be left blank.
 *
 * `z.coerce.number()` alone would read an empty input as `Number("") === 0`
 * and quietly send a real zero for "not measured". Blank has to become
 * `undefined` before coercion, so the key is omitted from the payload instead.
 */
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().optional(),
);

const partySchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  // `.or(z.literal(""))` because the field is optional but the browser hands
  // back "" rather than undefined once it has been focused and cleared.
  email: z.email("Enter a valid email address").optional().or(z.literal("")),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  /** The readable name for `state`, kept in sync by `LocationFields`. */
  state_name: z.string().optional(),
  city: z.string().min(1, "City is required"),
  zip: z.string().min(1, "ZIP / postal code is required"),
  address_1: z.string().min(1, "Address is required"),
  address_2: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  telephone: z.string().optional(),
  telephone_ext: z.string().optional(),
  is_resident: z.enum(YES_NO),
  address_type: z.enum(PARTY_ADDRESS_TYPES),
});

const senderSchema = partySchema;

/** The receiver also carries coordinates, derived from the chosen city. */
const receiverSchema = partySchema.extend({
  latitude: optionalNumber,
  longitude: optionalNumber,
});

const boxItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  item_hs_code: z.string().optional(),
  item_hs_code_label: z.string().optional(),
  item_material: z.string().optional(),
  item_material_label: z.string().optional(),
  item_manufacturer: z.string().optional(),
  item_manufacturer_label: z.string().optional(),
  item_gender: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  item_quantity_code: z.string().min(1, "Required"),
  item_rate: z.coerce.number().nonnegative("Rate cannot be negative"),
  item_total_amount: z.coerce.number().nonnegative("Total cannot be negative"),
  item_currency: z.string().min(1, "Required"),
  item_currency_label: z.string().optional(),
});

const boxSchema = z.object({
  box_no: z.coerce.number().positive(),
  weight: z.coerce.number().positive("Weight must be greater than 0"),
  volumetric_weight: optionalNumber,
  length: optionalNumber,
  width: optionalNumber,
  height: optionalNumber,
  no_of_pcs: z.coerce.number().positive("No. of pieces must be greater than 0"),
  goods_desc: z.string().min(1, "Goods description is required"),
  hs_code: z.string().optional(),
  hs_code_label: z.string().optional(),
  quantity_code: z.string().min(1, "Required"),
  declared_currency: z.string().min(1, "Required"),
  declared_currency_label: z.string().optional(),
  declared_value: z.coerce.number().nonnegative("Declared value cannot be negative"),
  // A box with nothing in it cannot clear customs, so the API rejects it —
  // better to say so here than to round-trip for a 422.
  items: z.array(boxItemSchema).min(1, "Add at least one item to this box"),
});

export const consignmentFormSchema = z
  .object({
    urgency: z.string().min(1, "Urgency is required"),

    sender: senderSchema,
    receiver: receiverSchema,
    boxes: z.array(boxSchema).min(1, "Add at least one box"),

    ship_date: z.string().min(1, "Ship date is required"),
    need_pickup: z.enum(YES_NO),
    pickup_time: z.string().optional(),

    preferred_delivery_time: z.string().optional(),
    pickup_note: z.string().optional(),
    delivery_note: z.string().optional(),

    product_type: z.string().optional(),
    product_type_label: z.string().optional(),

    have_hscode: z.enum(YES_NO),
    consignment_hs_code: z.string().optional(),
    consignment_hs_code_label: z.string().optional(),

    consignment_goods_desc: z.string().optional(),
    declared_value: z.coerce.number().nonnegative("Declared value cannot be negative"),
    declared_currency: z.string().min(1, "Required"),
    declared_currency_label: z.string().optional(),

    nature_of_goods: z.string().optional(),
    shipper_reference_code: z.string().optional(),

    send_updates: z.enum(YES_NO),
  })
  // Conditional, so it cannot live on the field: a pickup time is meaningless
  // unless a pickup was asked for, and required the moment it is.
  .superRefine((data, ctx) => {
    if (data.need_pickup === "Y" && !data.pickup_time) {
      ctx.addIssue({
        code: "custom",
        message: "Pickup time is required when a pickup is requested",
        path: ["pickup_time"],
      });
    }
  });

/**
 * The form has two types, and the difference matters.
 *
 * A number input hands back a *string*, so every numeric field is declared
 * with `z.coerce` — which means the schema's input type (what the form holds
 * and what the controls bind to) is not its output type (what validation
 * produces and what the payload builders receive).
 *
 * react-hook-form models this with three generics:
 * `useForm<Input, Context, Output>`. Collapsing them to one is what produces
 * the "two different types with this name exist" error, because the resolver's
 * output no longer matches the form's values.
 */
export type ConsignmentFormInput = z.input<typeof consignmentFormSchema>;
export type ConsignmentFormValues = z.output<typeof consignmentFormSchema>;

export type BoxFormValues = ConsignmentFormValues["boxes"][number];
export type BoxItemFormValues = BoxFormValues["items"][number];

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

/** The most common shipping unit and currency — changeable, but rarely changed. */
export const DEFAULT_QUANTITY_CODE = "PCS";
export const DEFAULT_CURRENCY = "USD";

export const newBoxItemDefaults: BoxItemFormValues = {
  item_name: "",
  item_hs_code: "",
  item_hs_code_label: "",
  item_material: "",
  item_material_label: "",
  item_manufacturer: "",
  item_manufacturer_label: "",
  item_gender: "",
  quantity: 1,
  item_quantity_code: DEFAULT_QUANTITY_CODE,
  item_rate: 0,
  item_total_amount: 0,
  item_currency: DEFAULT_CURRENCY,
  item_currency_label: DEFAULT_CURRENCY,
};

export const newBoxDefaults: BoxFormValues = {
  box_no: 1,
  weight: 0,
  volumetric_weight: undefined,
  length: undefined,
  width: undefined,
  height: undefined,
  no_of_pcs: 1,
  goods_desc: "",
  hs_code: "",
  hs_code_label: "",
  quantity_code: DEFAULT_QUANTITY_CODE,
  declared_currency: DEFAULT_CURRENCY,
  declared_currency_label: DEFAULT_CURRENCY,
  declared_value: 0,
  items: [{ ...newBoxItemDefaults }],
};

/** The sender is nearly always domestic, so the origin country is pre-filled. */
export const senderDefaults: ConsignmentFormValues["sender"] = {
  first_name: "",
  last_name: "",
  company: "",
  email: "",
  country: "NP",
  state: "",
  state_name: "",
  city: "",
  zip: "",
  address_1: "",
  address_2: "",
  phone: "",
  telephone: "",
  telephone_ext: "",
  is_resident: "Y",
  address_type: "RESIDENT",
};

/** The receiver's country comes from the rate check, so it starts blank. */
export const receiverDefaults: ConsignmentFormValues["receiver"] = {
  ...senderDefaults,
  country: "",
  latitude: undefined,
  longitude: undefined,
};
