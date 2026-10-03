"use client";

import { Wallet } from "lucide-react";

import {
  CREDIT_TONE_FILL,
  creditUsage,
  formatMoney,
} from "@/shared/billing/credit";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

import { useBillingCredit } from "../_hooks/use-billing-credit";
import { CreditSummaryPanel } from "./credit-summary-panel";

/**
 * The header's credit glance — display only.
 *
 * Two shapes from one trigger:
 *
 *   below md  a 36px wallet icon, the bell's size, with a dot when usage is
 *             high. The header row is already near its 375px budget, so the
 *             figures live in the popover.
 *   md and up a chip: "Available" over the amount, with a thin usage bar.
 *
 * Either way the popover shows limit, used and available in full.
 *
 * Hides itself on error or when there is no credit block — a missing figure
 * must not break the header on every page.
 */
export function CreditHeaderWidget() {
  const { data: credit, isLoading, isError } = useBillingCredit();

  if (isLoading) {
    // Same footprint as the loaded trigger, so the header does not shift.
    return <Skeleton className="size-9 rounded-lg sm:size-10 md:w-36" />;
  }

  if (isError || !credit) return null;

  const { limit, available, hasLimit, usedPercent, tone } = creditUsage(credit);
  const currency = credit.currency;

  const label = hasLimit
    ? `Credit: ${formatMoney(available, currency)} available of ${formatMoney(limit, currency)}`
    : "Credit: no limit set";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-label={label}
          className={cn(
            "relative size-9 shrink-0 px-0 sm:size-10",
            "md:h-10 md:w-auto md:gap-2.5 md:border md:border-border md:px-3",
          )}
        >
          <Wallet
            className={cn(
              "size-5",
              tone === "danger"
                ? "text-destructive"
                : tone === "warning"
                  ? "text-amber-600"
                  : "md:text-primary",
            )}
            aria-hidden
          />

          {/* Mobile only: the one signal that fits beside the icon. */}
          {tone !== "normal" ? (
            <span
              aria-hidden
              className={cn(
                "absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-card md:hidden",
                CREDIT_TONE_FILL[tone],
              )}
            />
          ) : null}

          <span className="hidden min-w-0 flex-col items-start gap-0.5 md:flex">
            <span className="text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
              {hasLimit ? "Available" : "Credit"}
            </span>
            <span
              className={cn(
                "text-sm font-semibold leading-tight tabular-nums",
                available !== null && available < 0
                  ? "text-destructive"
                  : "text-foreground",
              )}
            >
              {hasLimit ? formatMoney(available, currency) : "No limit"}
            </span>
            {hasLimit ? (
              <span className="h-1 w-full min-w-20 overflow-hidden rounded-full bg-secondary">
                <span
                  className={cn("block h-full rounded-full", CREDIT_TONE_FILL[tone])}
                  style={{ width: `${usedPercent}%` }}
                />
              </span>
            ) : null}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
        <CreditSummaryPanel credit={credit} />
      </PopoverContent>
    </Popover>
  );
}
