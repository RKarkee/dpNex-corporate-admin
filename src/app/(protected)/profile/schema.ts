import { z } from "zod";

import { ADDRESS_TYPES } from "./types";

/**
 * Validation for the profile form.
 *
 * Lengths mirror the API's own column limits, so a value that would come back
 * as a 422 is caught before the request. Where the two disagree the API wins —
 * these are a courtesy, not the enforcement.
 *
 * `.or(z.literal(""))` appears on every optional field the user can focus and
 * clear: the browser hands back `""` rather than `undefined`, and the payload
 * builder is what strips those before they reach the wire.
 */

const YES_NO = ["Y", "N"] as const;

export const addressSchema = z.object({
  /** Present only on a row that already exists server-side. */
  id: z.number().optional(),
  type: z.enum(ADDRESS_TYPES).optional(),

  // Country and state are iso2 codes; `LocationFields` guarantees the country
  // is a real one (`allowCustomValue={false}`) but state and city may be typed
  // freely, so only presence is checked here.
  country: z
    .string()
    .min(1, "Country is required")
    .max(2, "Country must be a 2-letter code"),
  state: z.string().max(100).optional(),
  /** Mirrored from `state` by `LocationFields`; never user-edited. */
  state_name: z.string().max(100).optional(),
  city: z.string().min(1, "City is required").max(30),

  address_line_1: z.string().min(1, "Address is required").max(150),
  address_line_2: z.string().max(150).optional(),
  zip: z.string().min(1, "ZIP / postal code is required").max(10),

  email: z.email("Enter a valid email address").max(150).optional().or(z.literal("")),
  phone_1: z.string().max(20).optional(),
  phone_2: z.string().max(20).optional(),
  telephone_1: z.string().max(20).optional(),
  telephone_1_ext: z.string().max(5).optional(),
  telephone_2: z.string().max(20).optional(),
  telephone_2_ext: z.string().max(5).optional(),

  is_primary: z.enum(YES_NO),

  /**
   * Read back from the API and round-tripped untouched. No control edits them;
   * they live in form state only so the payload can carry them back, since
   * omitting them on save would clear whatever the API had stored.
   */
  effective_from: z.string().nullable().optional(),
  effective_to: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  notes: z.string().max(500).optional(),

  phone_1: z.string().min(1, "Primary mobile is required").max(20),
  phone_2: z.string().max(20).optional(),
  telephone_1: z.string().max(20).optional(),
  telephone_1_ext: z.string().max(5).optional(),
  telephone_2: z.string().max(20).optional(),
  telephone_2_ext: z.string().max(5).optional(),

  addresses: z.array(addressSchema),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type AddressFormValues = z.infer<typeof addressSchema>;

/** A blank row for the "Add address" button. */
export const EMPTY_ADDRESS: AddressFormValues = {
  type: "CURRENT",
  country: "",
  state: "",
  state_name: "",
  city: "",
  address_line_1: "",
  address_line_2: "",
  zip: "",
  email: "",
  phone_1: "",
  phone_2: "",
  telephone_1: "",
  telephone_1_ext: "",
  telephone_2: "",
  telephone_2_ext: "",
  is_primary: "N",
  effective_from: null,
  effective_to: null,
  remarks: null,
};

/** What the form opens with before a profile has loaded, and in create mode. */
export const EMPTY_PROFILE_FORM: ProfileFormValues = {
  name: "",
  notes: "",
  phone_1: "",
  phone_2: "",
  telephone_1: "",
  telephone_1_ext: "",
  telephone_2: "",
  telephone_2_ext: "",
  addresses: [],
};
