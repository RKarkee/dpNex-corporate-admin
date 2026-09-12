import { z } from "zod";

import {
  APPROVAL_TYPES,
  DEFAULT_APPROVAL_TYPE,
  DISCOUNT_TYPES,
  infoFieldsFor,
  type ApprovalType,
} from "./types";

/**
 * Validation for the "raise a request" form.
 *
 * One flat schema with a `superRefine`, rather than a discriminated union on
 * `type`. The union is the truer model of the payload, but the form is a
 * single object whose fields swap as the type changes, and react-hook-form
 * would need the whole field set re-registered on every switch to keep a union
 * resolver happy. The refinement gets the same guarantees from one shape:
 * fields that do not belong to the chosen type are simply never read.
 *
 * Numbers are held as strings because that is what an `<input>` gives back,
 * and because `""` has to stay distinguishable from `0` — "no credit limit
 * entered" and "a credit limit of zero" are different requests. The mappers
 * coerce on the way out.
 */

export const REASON_MAX = 2000;

/** The API's own ceiling for `credit_limit`, applied to money fields here. */
export const AMOUNT_MAX = 999_999_999_999;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `""` → `undefined`; anything non-numeric → `undefined`, never `NaN`. */
export function parseAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const approvalRequestSchema = z
  .object({
    type: z.enum(APPROVAL_TYPES),
    reason: z
      .string()
      .max(REASON_MAX, `Reason must be ${REASON_MAX} characters or fewer`),

    /** CREDIT_LIMIT_INCREASE */
    credit_limit: z.string(),

    /** DISCOUNT — `subject_label` is shown, `subject_id` is sent. */
    subject_id: z.string(),
    subject_label: z.string(),
    discount_type: z.string(),
    discount_value: z.string(),

    /** The two update types, keyed by attribute name. */
    info: z.record(z.string(), z.string()),
  })
  .superRefine((values, ctx) => {
    if (values.type === "CREDIT_LIMIT_INCREASE") {
      const amount = parseAmount(values.credit_limit);

      if (amount === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["credit_limit"],
          message: "Enter the credit limit you are asking for",
        });
      } else if (amount < 0 || amount > AMOUNT_MAX) {
        ctx.addIssue({
          code: "custom",
          path: ["credit_limit"],
          message: `Must be between 0 and ${AMOUNT_MAX.toLocaleString()}`,
        });
      }
      return;
    }

    if (values.type === "DISCOUNT") {
      // The only type whose subject the user picks: a discount is asked
      // against one consignment, and the server will not infer which.
      if (!values.subject_id.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["subject_id"],
          message: "Choose the consignment this discount applies to",
        });
      }

      const discountType = values.discount_type as (typeof DISCOUNT_TYPES)[number];
      if (!DISCOUNT_TYPES.includes(discountType)) {
        ctx.addIssue({
          code: "custom",
          path: ["discount_type"],
          message: "Choose a fixed amount or a percentage",
        });
      }

      const amount = parseAmount(values.discount_value);
      if (amount === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["discount_value"],
          message: "Enter the discount you are asking for",
        });
      } else if (amount < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["discount_value"],
          message: "Must be 0 or more",
        });
      } else if (discountType === "PERCENTAGE" && amount > 100) {
        // Caught here rather than by the API, because "1500" typed into a
        // percentage field is a slip with an expensive-looking outcome.
        ctx.addIssue({
          code: "custom",
          path: ["discount_value"],
          message: "A percentage cannot be more than 100",
        });
      } else if (discountType === "FIXED" && amount > AMOUNT_MAX) {
        ctx.addIssue({
          code: "custom",
          path: ["discount_value"],
          message: `Must be ${AMOUNT_MAX.toLocaleString()} or less`,
        });
      }
      return;
    }

    /* Both update types, validated against their own whitelist. */
    const fields = infoFieldsFor(values.type);
    let filled = 0;

    for (const field of fields) {
      const value = (values.info[field.name] ?? "").trim();
      if (!value) continue;
      filled += 1;

      if (field.exactLength && value.length !== field.exactLength) {
        ctx.addIssue({
          code: "custom",
          path: ["info", field.name],
          message: `Must be exactly ${field.exactLength} characters`,
        });
        continue;
      }

      if (value.length > field.maxLength) {
        ctx.addIssue({
          code: "custom",
          path: ["info", field.name],
          message: `Must be ${field.maxLength} characters or fewer`,
        });
        continue;
      }

      if (field.kind === "email" && !EMAIL_PATTERN.test(value)) {
        ctx.addIssue({
          code: "custom",
          path: ["info", field.name],
          message: "Enter a valid email address",
        });
      }
    }

    // An empty payload would be a request to change nothing, which a reviewer
    // can only reject. The message goes on the form rather than a field,
    // because no single field is the one at fault.
    if (filled === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["info"],
        message: "Change at least one detail before submitting",
      });
    }
  });

export type ApprovalFormValues = z.infer<typeof approvalRequestSchema>;

/**
 * A blank form.
 *
 * Every key is present from the start — react-hook-form treats a field that
 * appears later as uncontrolled, and the input would warn on first keystroke.
 */
export function emptyApprovalForm(
  type: ApprovalType = DEFAULT_APPROVAL_TYPE,
): ApprovalFormValues {
  return {
    type,
    reason: "",
    credit_limit: "",
    subject_id: "",
    subject_label: "",
    discount_type: "FIXED",
    discount_value: "",
    info: {},
  };
}
