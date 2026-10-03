"use client";

import {
  CalendarClock,
  Ban,
  Percent,
  PiggyBank,
  ShieldCheck,
  ShieldOff,
  Wallet,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  CREDIT_TONE_FILL,
  creditUsage,
  formatMoney,
  type CustomerCredit,
} from "@/shared/billing/credit";
import { formatAmount } from "@/shared/lib/numbers";
import { cn } from "@/shared/lib/utils";

/**
 * The account's credit position and terms — read-only.
 *
 * Nothing here is editable: a limit change is an approval request
 * (`/approval-requests`, type `CREDIT_LIMIT_INCREASE`), not a profile field.
 *
 * The usage maths (available, percent, tone) is `creditUsage` in
 * `shared/billing/credit`, shared with the header widget.
 */

export function CreditDetailsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((tile) => (
            <Skeleton key={tile} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((term) => (
            <Skeleton key={term} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CreditDetailsCard({ credit }: { credit: CustomerCredit }) {
  const currency = credit.currency ?? "";
  const { limit, available, hasLimit, usedPercent, tone } = creditUsage(credit);
  const money = (value: number | null) => formatMoney(value, currency);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Wallet className="size-5 text-primary" aria-hidden />
            Credit Details
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {currency ? <Badge variant="outline">{currency}</Badge> : null}
            {credit.is_enforced ? (
              <Badge variant="success">
                <ShieldCheck className="size-3.5" aria-hidden />
                Limit enforced
              </Badge>
            ) : (
              <Badge variant="secondary">
                <ShieldOff className="size-3.5" aria-hidden />
                Not enforced
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <AmountTile
            label="Credit limit"
            value={hasLimit ? money(limit) : "Not set"}
          />
          <AmountTile label="Used" value={money(credit.used_limit)} />
          <AmountTile
            label="Available"
            value={money(available)}
            tone={available !== null && available < 0 ? "danger" : "normal"}
          />
        </div>

        {hasLimit ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Credit used</span>
              <span className="font-medium text-foreground">
                {formatAmount(usedPercent)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Credit used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usedPercent)}
              className="h-2 w-full overflow-hidden rounded-full bg-secondary"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  CREDIT_TONE_FILL[tone],
                )}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            No credit limit has been set for this account yet. You can ask for
            one from Approval Requests.
          </p>
        )}

        <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Term
            icon={CalendarClock}
            label="Credit days"
            value={
              credit.credit_days === null
                ? "—"
                : credit.credit_days === 1
                  ? "1 day"
                  : `${credit.credit_days} days`
            }
          />
          <Term
            icon={Percent}
            label="Interest rate"
            value={
              credit.interest_rate === null
                ? "—"
                : `${formatAmount(credit.interest_rate)}%`
            }
          />
          <Term
            icon={PiggyBank}
            label="Advance balance"
            value={money(credit.advance_balance)}
          />
          <Term
            icon={Ban}
            label="Block on overdue"
            value={credit.block_on_overdue === "Y" ? "Yes" : "No"}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function AmountTile({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-lg font-bold tabular-nums sm:text-xl",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Term({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}
