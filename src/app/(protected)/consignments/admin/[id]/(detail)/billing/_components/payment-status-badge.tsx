"use client";

import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { formatEnumLabel } from "../_lib/format-invoice";

/**
 * Same approach as `InvoiceStatusBadge`: colour by the raw enum, text from
 * `formatEnumLabel` since this endpoint sends no separate display label the
 * way invoices' `status_label` does. Unrecognised values still render, in a
 * neutral colour, rather than disappearing.
 */
const VARIANT_BY_STATUS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  COMPLETED: "success",
  SUCCESS: "success",
  PENDING: "warning",
  PROCESSING: "warning",
  FAILED: "destructive",
  REJECTED: "destructive",
  REVERSED: "outline",
  REFUNDED: "outline",
  CANCELLED: "outline",
};

export function PaymentStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;

  const variant = VARIANT_BY_STATUS[status.toUpperCase()] ?? "secondary";

  return <Badge variant={variant}>{formatEnumLabel(status)}</Badge>;
}
