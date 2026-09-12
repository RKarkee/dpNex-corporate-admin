import { Badge, type BadgeProps } from "@/shared/components/ui/badge";

import type { SupportTicket } from "../types";

/**
 * Status, priority and category, as badges.
 *
 * Status and priority are different questions and get different scales on
 * purpose: a LOW-priority ticket that has been escalated is not a quiet ticket,
 * and one colour doing both jobs would say it was.
 */

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusVariant(status: string): BadgeProps["variant"] {
  const value = status.toUpperCase();

  if (value === "ESCALATED") return "destructive";
  if (value === "RESOLVED") return "success";
  if (value === "CLOSED") return "secondary";
  if (value === "IN_PROGRESS") return "default";
  // OPEN and REOPENED are both "someone still has to do something".
  return "warning";
}

export function TicketStatusBadge({ ticket }: { ticket: SupportTicket }) {
  const status = String(ticket.status ?? "");
  if (!status) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant={statusVariant(status)}>
      {ticket.status_label?.trim() || humanize(status)}
    </Badge>
  );
}

function priorityVariant(priority: string): BadgeProps["variant"] {
  const value = priority.toUpperCase();

  if (value === "URGENT") return "destructive";
  if (value === "HIGH") return "warning";
  if (value === "LOW") return "secondary";
  return "outline";
}

export function TicketPriorityBadge({ priority }: { priority?: string | null }) {
  const value = String(priority ?? "");
  if (!value) return <span className="text-muted-foreground">—</span>;

  return <Badge variant={priorityVariant(value)}>{humanize(value)}</Badge>;
}

export function TicketCategoryBadge({ category }: { category?: string | null }) {
  const value = String(category ?? "");
  if (!value) return <span className="text-muted-foreground">—</span>;

  return <Badge variant="outline">{humanize(value)}</Badge>;
}
