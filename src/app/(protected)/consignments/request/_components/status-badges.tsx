import { Badge, type BadgeProps } from "@/shared/components/ui/badge";

/**
 * Status and urgency, as badges.
 *
 * The API's status vocabulary is open-ended — `PENDING_CORPORATE_APPROVAL`,
 * `IN_TRANSIT`, `REJECTED_BY_AGENT` and more get added over time — so these
 * match on substrings rather than an exhaustive list. A status nobody has seen
 * before renders in neutral grey with its words spaced out, which is a far
 * better outcome than a blank cell or a crash.
 */

export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusVariant(status: string): BadgeProps["variant"] {
  const value = status.toUpperCase();

  if (/REJECT|CANCEL|FAIL|DECLINE/.test(value)) return "destructive";
  // "Pending approval" contains APPROV but is not approved — order matters.
  if (/PENDING|DRAFT|AWAIT|HOLD/.test(value)) return "warning";
  if (/APPROV|DELIVER|COMPLETE|SUCCESS/.test(value)) return "success";
  if (/TRANSIT|PICKUP|PROCESS|COLLECT/.test(value)) return "default";

  return "secondary";
}

export function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={statusVariant(status)}>{humanizeStatus(status)}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  if (!urgency) return <span className="text-muted-foreground">—</span>;

  const value = urgency.toUpperCase();
  const variant: BadgeProps["variant"] = /URGENT|EXPRESS|PRIORITY/.test(value)
    ? "destructive"
    : "secondary";

  return <Badge variant={variant}>{humanizeStatus(urgency)}</Badge>;
}
