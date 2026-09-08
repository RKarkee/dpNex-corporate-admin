"use client";

import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { formatEnumLabel } from "../_lib/format-invoice";

/**
 * Colour by the raw enum, text from `status_label` when the API sends one —
 * same approach as `InvoiceStatusBadge` — falling back to `formatEnumLabel`
 * otherwise, the same way `PaymentStatusBadge` does. Unrecognised values
 * still render, in a neutral colour, rather than disappearing.
 */
const VARIANT_BY_STATUS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  APPROVED: "success",
  PENDING: "warning",
  AWAITING_APPROVAL: "warning",
  REJECTED: "destructive",
  DECLINED: "destructive",
  CANCELLED: "outline",
  CANCELED: "outline",
  REVERSED: "outline",
};

export function AdjustmentStatusBadge({
  status,
  label,
}: {
  status: string | null | undefined;
  label?: string | null;
}) {
  if (!status && !label) return <span className="text-muted-foreground">—</span>;

  const variant = (status ? VARIANT_BY_STATUS[status.toUpperCase()] : undefined) ?? "secondary";
  const text = label?.trim() || formatEnumLabel(status);

  return <Badge variant={variant}>{text}</Badge>;
}
