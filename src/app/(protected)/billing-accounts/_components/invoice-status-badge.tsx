"use client";

import { Badge, type BadgeProps } from "@/shared/components/ui/badge";

/**
 * Colour by the raw enum (`PARTIALLY_PAID`), text from `status_label`
 * (`"Partially Paid"`) — the API already writes the label a person should
 * read, so this never reformats it. Anything not in the map below still
 * renders, in a neutral colour, rather than disappearing.
 */
const VARIANT_BY_STATUS: Record<string, NonNullable<BadgeProps["variant"]>> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  UNPAID: "warning",
  PENDING: "warning",
  OVERDUE: "destructive",
  CANCELLED: "outline",
  CANCELED: "outline",
  VOID: "outline",
  DRAFT: "secondary",
};

export function InvoiceStatusBadge({
  status,
  label,
}: {
  status: string | null | undefined;
  /** The API's own display text. Falls back to a title-cased `status` when absent. */
  label?: string | null;
}) {
  if (!status && !label) return <span className="text-muted-foreground">—</span>;

  const variant = (status ? VARIANT_BY_STATUS[status.toUpperCase()] : undefined) ?? "secondary";
  const text = label?.trim() || status!.replace(/_/g, " ");

  return <Badge variant={variant}>{text}</Badge>;
}
