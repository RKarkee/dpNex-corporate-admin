import { Badge, type BadgeProps } from "@/shared/components/ui/badge";

import type { ApprovalRequest } from "../types";

/**
 * Status and type, as badges.
 *
 * Both prefer the server's own `*_label` — "Pending Approval" reads better than
 * anything derived from the key, and it is the wording the reviewer sees on
 * their side too. The key is the fallback, humanised, so a status nobody has
 * seen before renders in neutral grey instead of leaving a blank cell.
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

  // "Pending approval" contains APPROV but is not approved — order matters.
  if (/PENDING|AWAIT/.test(value)) return "warning";
  if (/REJECT|CANCEL|DECLINE/.test(value)) return "destructive";
  if (/APPROV|APPLIED|COMPLETE/.test(value)) return "success";

  return "secondary";
}

export function ApprovalStatusBadge({ request }: { request: ApprovalRequest }) {
  const status = String(request.status ?? "");
  if (!status) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant={statusVariant(status)}>
      {request.status_label?.trim() || humanize(status)}
    </Badge>
  );
}

export function ApprovalTypeBadge({ request }: { request: ApprovalRequest }) {
  const type = String(request.type ?? "");
  if (!type) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant="outline">
      {request.type_label?.trim() || humanize(type)}
    </Badge>
  );
}
