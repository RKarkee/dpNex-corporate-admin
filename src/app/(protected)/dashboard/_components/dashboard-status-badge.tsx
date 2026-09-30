import { Badge } from "@/shared/components/ui/badge";

/**
 * Dashboard-local status formatting.
 *
 * `consignments/admin` already has a `StatusBadge`, but this codebase's
 * convention (see `documents.service.ts`) is to duplicate small per-module
 * helpers rather than reach across feature folders — so this is a small,
 * self-contained copy of the same keyword-based mapping, scoped to the
 * dashboard's own statuses breakdown.
 */
function humanizeStatus(status: string): string {
  return status
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusVariant(status: string): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" {
  const value = status.toLowerCase();
  if (/(cancel|reject|fail|void)/.test(value)) return "destructive";
  if (/(pending|hold|await|draft)/.test(value)) return "warning";
  if (/(complete|deliver|closed|paid|approved|active)/.test(value)) return "success";
  if (/(transit|progress|processing)/.test(value)) return "default";
  return "secondary";
}

export function DashboardStatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{humanizeStatus(status)}</Badge>;
}
