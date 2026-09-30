import { Badge } from "@/shared/components/ui/badge";

/**
 * Report-local status formatting — a self-contained copy of the same
 * keyword-based mapping used by the dashboard and other reports' status
 * badges, per this codebase's convention of duplicating small per-module
 * helpers rather than reaching across feature folders.
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

export function SummaryStatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{humanizeStatus(status)}</Badge>;
}
