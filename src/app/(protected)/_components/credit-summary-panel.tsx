import { ShieldOff, Wallet } from "lucide-react";

import {
  CREDIT_TONE_FILL,
  creditUsage,
  formatMoney,
  type CustomerCredit,
} from "@/shared/billing/credit";
import { formatAmount } from "@/shared/lib/numbers";
import { cn } from "@/shared/lib/utils";

/**
 * The credit figures as a compact panel — the body of the header popover.
 *
 * Display only. Kept apart from the trigger so the panel can be dropped into
 * any other surface without bringing the header's popover along.
 */
export function CreditSummaryPanel({ credit }: { credit: CustomerCredit }) {
  const { limit, used, available, hasLimit, usedPercent, tone } =
    creditUsage(credit);
  const currency = credit.currency;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Credit</h2>
        {currency ? (
          <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {currency}
          </span>
        ) : null}
      </div>

      <dl className="space-y-2.5">
        <Row
          label="Credit limit"
          value={hasLimit ? formatMoney(limit, currency) : "Not set"}
        />
        <Row label="Used" value={formatMoney(used, currency)} />
        <Row
          label="Available"
          value={formatMoney(available, currency)}
          emphasis
          danger={available !== null && available < 0}
        />
      </dl>

      {hasLimit ? (
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-label="Credit used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usedPercent)}
            className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          >
            <div
              className={cn("h-full rounded-full", CREDIT_TONE_FILL[tone])}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatAmount(usedPercent)}% of limit used
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No credit limit has been set for this account.
        </p>
      )}

      {!credit.is_enforced ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldOff className="size-3.5" aria-hidden />
          Credit limit is not enforced
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  emphasis = false,
  danger = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "truncate tabular-nums",
          emphasis ? "text-base font-bold" : "text-sm font-medium",
          danger ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
