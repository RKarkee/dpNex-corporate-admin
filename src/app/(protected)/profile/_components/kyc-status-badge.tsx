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

import { kycStatusLabel, type KycStatus } from "../types";

/**
 * A KYC status, as a badge.
 *
 * Every status carries an icon as well as a colour. The reference app used
 * colour alone (`bg-yellow-100 text-yellow-800`), which fails a colour-blind
 * read and hardcodes a light-mode palette; these use the `Badge` variants, so
 * they follow the design tokens into dark mode.
 */

const STATUS_STYLES: Record<
  KycStatus,
  { variant: BadgeProps["variant"]; icon: LucideIcon }
> = {
  PENDING: { variant: "warning", icon: Clock },
  APPROVED: { variant: "success", icon: CheckCircle2 },
  REJECTED: { variant: "destructive", icon: XCircle },
  RE_PROCESS: { variant: "default", icon: RefreshCw },
  EXPIRED: { variant: "secondary", icon: AlertCircle },
};

export function KycStatusBadge({
  status,
  className,
}: {
  status: KycStatus;
  className?: string;
}) {
  const { variant, icon: Icon } = STATUS_STYLES[status];

  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <Icon className="size-3.5" aria-hidden />
      {kycStatusLabel(status)}
    </Badge>
  );
}

/** The header badge, which also has to render "no documents yet". */
export function KycOverallBadge({ status }: { status: KycStatus | null }) {
  if (!status) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <AlertCircle className="size-3.5" aria-hidden />
        KYC not verified
      </Badge>
    );
  }

  return <KycStatusBadge status={status} />;
}
