"use client";

import * as React from "react";
import { MapPin, PackageSearch } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useCountryOptions } from "@/shared/hooks/use-location-options";

import { joinPlace } from "../../lib/format";
import type { CheckRatesInput, RateOption } from "../../types";
import { RateCard, transitDays } from "./rate-card";
import { RateNotice } from "./rate-notice";

/**
 * The rate cards, cheapest first.
 *
 * Two of them are called out — the lowest price and the fastest transit —
 * since choosing between carriers is the whole reason to look. The fastest is
 * only marked when at least one rate actually promises a transit time; the API
 * sends `null` for those it cannot commit to, and a "fastest" among nothing
 * would be noise.
 */

function total(rate: RateOption): number {
  const n = Number(rate.total_amount);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

export function RateResults({ rates, input }: { rates: RateOption[]; input: CheckRatesInput }) {
  const sorted = React.useMemo(() => [...rates].sort((a, b) => total(a) - total(b)), [rates]);

  const first = sorted[0];
  if (!first) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No rates available"
        description="Nothing serves that destination and weight right now. Try a different location or package."
      />
    );
  }

  const cheapest = first.customer_rate_id;

  const withTransit = sorted.filter((rate) => transitDays(rate) !== null);
  const fastest =
    withTransit.length > 0
      ? withTransit.reduce((best, rate) =>
          (transitDays(rate) as number) < (transitDays(best) as number) ? rate : best,
        ).customer_rate_id
      : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          {sorted.length} rate{sorted.length === 1 ? "" : "s"} available
        </h2>
        <QuerySummary input={input} />
      </div>

      <RateNotice />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((rate) => (
          <RateCard
            key={`${rate.customer_rate_id}-${rate.agent_rate_zone_id}`}
            rate={rate}
            lowest={rate.customer_rate_id === cheapest}
            fastest={rate.customer_rate_id === fastest}
          />
        ))}
      </div>
    </div>
  );
}

/** What was asked, in one line — so the cards below have their context. */
function QuerySummary({ input }: { input: CheckRatesInput }) {
  const { options: countries } = useCountryOptions();

  const country =
    countries.find((c) => c.value === input.receiver_country)?.label ?? input.receiver_country;

  const weight = input.boxes
    ? `${input.boxes.length} box${input.boxes.length === 1 ? "" : "es"} · ${input.boxes
        .reduce((sum, box) => sum + box.weight, 0)
        .toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`
    : `${input.total_weight} kg`;

  const parts = [
    joinPlace(input.receiver_city, input.receiver_state, country) +
      (input.receiver_zip ? ` ${input.receiver_zip}` : ""),
    input.package_type,
    weight,
  ].filter(Boolean);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      {parts.join("  ·  ")}
    </p>
  );
}

/** Blank cards, so the panel does not jump when the answer lands. */
export function RateResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
