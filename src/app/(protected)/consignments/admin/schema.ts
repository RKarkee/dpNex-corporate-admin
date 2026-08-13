import { z } from "zod";

import { PARTY_ADDRESS_TYPES, YES_NO } from "./types";

/**
 * Validation for the consignment form — one schema, shared by create and edit.
 *
 * **The party fields keep their prefixes.** `sender.sender_first_name`, not
 * `sender.first_name`, because that is what `/corporate/consignments` sends and
 * expects. It costs a longer path at every call site and means sender and
 * receiver are not interchangeable — but it removes a translation step in both
 * directions, which is where a silently-dropped field would hide.
 *
 * This resource validates harder than consignment requests do. Email, nature of
 * goods and the goods description are all required, and an HS code becomes
 * required the moment the shipper says they have one. Those are the reference
 * admin module's rules, and the API enforces them.
 *
 * Every async-lookup field is a pair: `hs_code` holds the code that is sent,
 * `hs_code_label` the name that is shown. The label lives in form state because
 * the trigger has to render something before — or without — the list that would
 * resolve it, which is exactly how an edit form opens. Labels are never
 * submitted.
 */

/**
 * A number field that may be left blank.
 *
 * `z.coerce.number()` alone reads an empty input as `Number("") === 0` and
 * quietly sends a real zero for "not measured". Blank has to become `undefined`
 * before coercion so the key is omitted from the payload instead.
 */
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().optional(),
);

const senderSchema = z.object({
  sender_first_name: z.string().min(1, "First name is required"),
  sender_last_name: z.string().min(1, "Last name is required"),
  sender_company: z.string().optional(),
  // Required here, unlike on a consignment request — the carrier needs a
  // contact for customs correspondence.
  sender_email: z.email("Enter a valid email address"),
  sender_country: z.string().min(1, "Country is required"),
  sender_state: z.string().min(1, "State is required"),
  /** The readable name for `sender_state`, kept in sync by `LocationFields`. */
  sender_state_name: z.string().optional(),
  sender_city: z.string().min(1, "City is required"),
  sender_zip: z.string().min(1, "ZIP / postal code is required"),
  sender_address_1: z.string().min(1, "Address is required"),
  sender_address_2: z.string().optional(),
  sender_phone: z.string().min(1, "Phone is required"),
  sender_telephone: z.string().optional(),
  sender_telephone_ext: z.string().optional(),
  sender_is_resident: z.enum(YES_NO),
  sender_address_type: z.enum(PARTY_ADDRESS_TYPES),
});

const receiverSchema = z.object({
  receiver_first_name: z.string().min(1, "First name is required"),
  receiver_last_name: z.string().min(1, "Last name is required"),
  receiver_company: z.string().optional(),
  receiver_email: z.email("Enter a valid email address"),
  receiver_country: z.string().min(1, "Country is required"),
  receiver_state: z.string().min(1, "State is required"),
  receiver_state_name: z.string().optional(),
  receiver_city: z.string().min(1, "City is required"),
  receiver_zip: z.string().min(1, "ZIP / postal code is required"),
  receiver_address_1: z.string().min(1, "Address is required"),
  receiver_address_2: z.string().optional(),
  receiver_phone: z.string().min(1, "Phone is required"),
  receiver_telephone: z.string().optional(),
  receiver_telephone_ext: z.string().optional(),
  receiver_is_resident: z.enum(YES_NO),
  receiver_address_type: z.enum(PARTY_ADDRESS_TYPES),
  /** Derived from the chosen city; editable. */
  receiver_latitude: optionalNumber,
  receiver_longitude: optionalNumber,
});

const itemSchema = z.object({
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
  items: z.array(itemSchema).min(1, "Add at least one item to this box"),
});

export const consignmentAdminFormSchema = z
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

    consignment_goods_desc: z.string().min(1, "Goods description is required"),
    declared_value: z.coerce.number().nonnegative("Declared value cannot be negative"),
    declared_currency: z.string().min(1, "Required"),
    declared_currency_label: z.string().optional(),

    nature_of_goods: z.string().min(1, "Nature of goods is required"),
    shipper_reference_code: z.string().optional(),

    send_updates: z.enum(YES_NO),
  })
  // Both rules are conditional, so neither can live on its own field.
  .superRefine((data, ctx) => {
    if (data.need_pickup === "Y" && !data.pickup_time) {
      ctx.addIssue({
        code: "custom",
        message: "Pickup time is required when a pickup is requested",
        path: ["pickup_time"],
      });
    }

    // Saying "yes, I have one" and then leaving it blank is the contradiction
    // the API rejects — and the reason this cannot be a plain `.min(1)`.
    if (
      data.have_hscode === "Y" &&
      !data.consignment_hs_code?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "HS code is required when the shipper has one",
        path: ["consignment_hs_code"],
      });
    }
  });

/**
 * The form has two types, and the difference matters.
 *
 * A number input hands back a *string*, so every numeric field is declared with
 * `z.coerce` — which means the schema's input type (what the form holds and
 * what the controls bind to) is not its output type (what validation produces
 * and what the payload builders receive).
 *
 * react-hook-form models this with three generics:
 * `useForm<Input, Context, Output>`. Collapsing them to one produces the "two
 * different types with this name exist" error, because the resolver's output no
 * longer matches the form's values.
 */
export type ConsignmentAdminFormInput = z.input<typeof consignmentAdminFormSchema>;
export type ConsignmentAdminFormValues = z.output<typeof consignmentAdminFormSchema>;

export type AdminBoxFormValues = ConsignmentAdminFormValues["boxes"][number];
export type AdminItemFormValues = AdminBoxFormValues["items"][number];

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

/** The most common shipping unit and currency — changeable, but rarely changed. */
export const DEFAULT_QUANTITY_CODE = "PCS";
export const DEFAULT_CURRENCY = "USD";

export const newItemDefaults: AdminItemFormValues = {
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

export const newBoxDefaults: AdminBoxFormValues = {
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
  items: [{ ...newItemDefaults }],
};

/** The sender is nearly always domestic, so the origin country is pre-filled. */
export const senderDefaults: ConsignmentAdminFormValues["sender"] = {
  sender_first_name: "",
  sender_last_name: "",
  sender_company: "",
  sender_email: "",
  sender_country: "NP",
  sender_state: "",
  sender_state_name: "",
  sender_city: "",
  sender_zip: "",
  sender_address_1: "",
  sender_address_2: "",
  sender_phone: "",
  sender_telephone: "",
  sender_telephone_ext: "",
  sender_is_resident: "Y",
  sender_address_type: "RESIDENT",
};

/** The receiver's country comes from the rate check, so it starts blank. */
export const receiverDefaults: ConsignmentAdminFormValues["receiver"] = {
  receiver_first_name: "",
  receiver_last_name: "",
  receiver_company: "",
  receiver_email: "",
  receiver_country: "",
  receiver_state: "",
  receiver_state_name: "",
  receiver_city: "",
  receiver_zip: "",
  receiver_address_1: "",
  receiver_address_2: "",
  receiver_phone: "",
  receiver_telephone: "",
  receiver_telephone_ext: "",
  receiver_is_resident: "Y",
  receiver_address_type: "RESIDENT",
  receiver_latitude: undefined,
  receiver_longitude: undefined,
};
