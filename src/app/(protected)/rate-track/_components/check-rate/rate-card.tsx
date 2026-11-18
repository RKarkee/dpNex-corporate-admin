"use client";

import { Clock, Route, Truck } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { formatDate } from "@/shared/lib/dates";

import { formatMoney, humanize } from "../../lib/format";
import type { RateOption } from "../../types";
import { InfoItem } from "../info-item";

/** Days to deliver, or `null` when the API will not commit to one. */
export function transitDays(rate: RateOption): number | null {
  const value: unknown = rate.transit_days;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface RateCardProps {
  rate: RateOption;
  lowest: boolean;
  fastest: boolean;
}

/**
 * One quote: carrier, service, transit, route and the price broken down.
 * Monochrome on purpose — outline badges and borders carry the emphasis.
 */
export function RateCard({ rate, lowest, fastest }: RateCardProps) {
  const carrier = rate.integrator_code || "Carrier";
  const service = rate.service_desc || rate.service_code;
  const zone = rate.zone_name
    ? rate.zone_code
      ? `${rate.zone_name} (${rate.zone_code})`
      : rate.zone_name
    : rate.zone_code;
  const route = [rate.agent_code, rate.via_code].filter(Boolean).join(" → ");
  const days = transitDays(rate);
  const surcharges = Array.isArray(rate.surcharge_details) ? rate.surcharge_details : [];

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-primary">
            <Truck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{carrier}</p>
            {service ? <p className="truncate text-sm text-muted-foreground">{service}</p> : null}
          </div>
        </div>

        {lowest || fastest ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {lowest ? (
              <Badge variant="outline" className="border-primary text-primary">
                Lowest price
              </Badge>
            ) : null}
            {fastest ? (
              <Badge variant="outline" className="border-primary text-primary">
                Fastest
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <InfoItem
          label="Transit"
          value={days !== null ? `${days} day${days === 1 ? "" : "s"}` : "Not committed"}
          icon={Clock}
        />
        <InfoItem
          label="Estimated arrival"
          value={rate.eta_date ? formatDate(rate.eta_date) : null}
        />
        <InfoItem label="Zone" value={zone} />
        <InfoItem label="Route" value={route} icon={Route} />
      </dl>

      <div className="mt-auto space-y-2 border-t border-border pt-4 text-sm">
        <PriceRow label="Base" value={formatMoney(rate.base_amount, rate.currency)} />

        <div className="space-y-1.5">
          <PriceRow label="Surcharges" value={formatMoney(rate.surcharge_amount, rate.currency)} />
          {surcharges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {surcharges.map((surcharge) => (
                <Badge key={surcharge.id} variant="secondary">
                  {surcharge.code}
                  {surcharge.type ? ` · ${humanize(surcharge.type)}` : ""}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-xl font-bold tabular-nums text-foreground">
            {formatMoney(rate.total_amount, rate.currency)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
