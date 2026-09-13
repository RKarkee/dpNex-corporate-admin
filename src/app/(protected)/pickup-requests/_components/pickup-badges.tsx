import { Badge, type BadgeProps } from "@/shared/components/ui/badge";

import { humanize, type PickupRequest } from "../types";

/**
 * Status, as a badge.
 *
 * The vocabulary is open-ended — only PENDING has been observed, and the
 * workflow clearly has more — so this matches on substrings rather than an
 * exhaustive list. A status nobody has seen before renders in neutral grey with
 * its words spaced out, which is a far better outcome than a blank cell.
 */
function statusVariant(status: string): BadgeProps["variant"] {
  const value = status.toUpperCase();

  if (/CANCEL|REJECT|FAIL/.test(value)) return "destructive";
  if (/PENDING|AWAIT|SCHEDUL|REQUEST/.test(value)) return "warning";
  if (/COLLECT|COMPLETE|DONE|PICKED/.test(value)) return "success";
  if (/ASSIGN|TRANSIT|PROGRESS|EN_ROUTE/.test(value)) return "default";

  return "secondary";
}

export function PickupStatusBadge({ pickup }: { pickup: PickupRequest }) {
  const status = String(pickup.status ?? "");
  if (!status) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant={statusVariant(status)}>
      {pickup.status_label?.trim() || humanize(status)}
    </Badge>
  );
}

/**
 * The status of a consignment request sitting on a pickup.
 *
 * Its vocabulary belongs to a different workflow and runs long
 * (`PENDING_CORPORATE_APPROVAL`, `MODIFICATION_REQUIRED_BY_CORPORATE`), so this
 * matches on substrings and prefers the server's `status_label`, which is
 * already written for a person.
 */
function consignmentVariant(status: string): BadgeProps["variant"] {
  const value = status.toUpperCase();

  if (/REJECT|CANCEL|FAIL/.test(value)) return "destructive";
  // "Pending approval" contains APPROV but is not approved — order matters.
  if (/PENDING|AWAIT|MODIFICATION|HOLD|DRAFT/.test(value)) return "warning";
  if (/APPROV|DELIVER|COMPLETE|COLLECT/.test(value)) return "success";
  if (/TRANSIT|PICKUP|PROCESS/.test(value)) return "default";

  return "secondary";
}

export function ConsignmentStatusBadge({
  status,
  label,
}: {
  status?: string | null;
  label?: string | null;
}) {
  const raw = String(status ?? "");
  if (!raw) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant={consignmentVariant(raw)}>
      {label?.trim() || humanize(raw)}
    </Badge>
  );
}
