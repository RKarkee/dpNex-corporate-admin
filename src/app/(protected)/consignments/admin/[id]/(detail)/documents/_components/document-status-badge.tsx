import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import { documentStatusLabel, type DocumentStatus } from "../types";

/**
 * A document status, as a badge.
 *
 * Every status carries an icon as well as a colour, so the state survives a
 * colour-blind read, and the `Badge` variants follow the design tokens into
 * dark mode.
 *
 * A standalone copy of the profile tab's badge — see `../types.ts`.
 */

const STATUS_STYLES: Record<
  DocumentStatus,
  { variant: BadgeProps["variant"]; icon: LucideIcon }
> = {
  PENDING: { variant: "warning", icon: Clock },
  APPROVED: { variant: "success", icon: CheckCircle2 },
  REJECTED: { variant: "destructive", icon: XCircle },
  RE_PROCESS: { variant: "default", icon: RefreshCw },
  EXPIRED: { variant: "secondary", icon: AlertCircle },
};

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
}) {
  const { variant, icon: Icon } = STATUS_STYLES[status];

  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <Icon className="size-3.5" aria-hidden />
      {documentStatusLabel(status)}
    </Badge>
  );
}
