import { Star } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";

import type { BillingAccount } from "../types";

/** `A` enabled, `I` disabled; `is_enabled` is the fallback when status is missing. */
export function AccountStatusBadge({ account }: { account: BillingAccount }) {
  const status = String(account.status ?? "").toUpperCase();
  const enabled = status ? status === "A" : account.is_enabled;

  if (enabled === undefined || enabled === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return enabled ? (
    <Badge variant="success">Enabled</Badge>
  ) : (
    <Badge variant="secondary">Disabled</Badge>
  );
}

export function DefaultAccountBadge() {
  return (
    <Badge variant="default">
      <Star aria-hidden className="size-3 fill-current" />
      Default
    </Badge>
  );
}
