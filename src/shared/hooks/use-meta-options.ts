"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { metaQuery, type MetaOption } from "@/shared/api/services/meta.service";
import type { ComboboxOption } from "@/shared/components/ui/combobox";

/**
 * The `/meta` enum lists, as combobox options.
 *
 * One query backs every control on the page — `metaQuery` is a single cache
 * entry with a one-hour stale time, so a form with six meta-driven selects
 * still makes one request, and a second form later in the session makes none.
 *
 * Every list defaults to `[]` when the API does not define that control, which
 * renders an empty dropdown rather than throwing mid-form.
 */

function toOptions(values: MetaOption[] | undefined): ComboboxOption[] {
  return (values ?? []).map((value) => ({
    value: String(value.key),
    label: value.label,
  }));
}

export interface MetaOptions {
  /** PCS, KG, … — used by boxes and by every item inside them. */
  quantityCodeOptions: ComboboxOption[];
  genderOptions: ComboboxOption[];
  productTypeOptions: ComboboxOption[];
  urgencyOptions: ComboboxOption[];
  /** PENDING, APPROVED, REJECTED, CANCELLED — the approval-request lifecycle. */
  approvalStatusOptions: ComboboxOption[];
  /** Credit limit, discount, corporate info update, profile update. */
  approvalTypeOptions: ComboboxOption[];
  /** Open, in progress, escalated, resolved, closed, reopened. */
  ticketStatusOptions: ComboboxOption[];
  ticketPriorityOptions: ComboboxOption[];
  /** General, billing, delivery, pickup, tracking, rates, technical, complaint. */
  ticketCategoryOptions: ComboboxOption[];
  isPending: boolean;
}

export function useMetaOptions(): MetaOptions {
  const { data, isPending } = useQuery(metaQuery);

  return React.useMemo(() => {
    const controls = data?.controls ?? {};

    return {
      quantityCodeOptions: toOptions(controls.item_quantity_code?.values),
      genderOptions: toOptions(controls.item_gender_type?.values),
      productTypeOptions: toOptions(controls.consignment_product_type?.values),
      urgencyOptions: toOptions(controls.consignment_urgency?.values),
      approvalStatusOptions: toOptions(controls.approval_statuses?.values),
      approvalTypeOptions: toOptions(controls.approval_request_types?.values),
      ticketStatusOptions: toOptions(controls.support_ticket_statuses?.values),
      ticketPriorityOptions: toOptions(controls.support_ticket_priorities?.values),
      ticketCategoryOptions: toOptions(controls.support_ticket_categories?.values),
      isPending,
    };
  }, [data, isPending]);
}

/** The label for a stored code, falling back to the code itself. */
export function optionLabel(
  options: ComboboxOption[],
  value?: string | null,
): string {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label ?? value;
}
