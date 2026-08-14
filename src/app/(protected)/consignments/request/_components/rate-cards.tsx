"use client";

import { CalendarClock, Clock, Route, Truck } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

import type { RateOption } from "../types";

/**
 * The two ways a quote is shown: as one of several options to pick from, and
 * as the confirmed choice at the top of the create form.
 *
 * They share the money block, which is the part that has to read identically
 * in both — a total that looks different after selection invites a
 * double-check the user should not have to make.
 */

function Row({
  label,
  value,
  icon: Icon,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
        {label}
      </span>
      <span
        className={
          strong
            ? "font-semibold text-foreground"
            : "font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Amounts({ rate, emphasize }: { rate: RateOption; emphasize?: boolean }) {
  return (
    <div className="space-y-1.5 border-t border-border/70 pt-3">
      <Row label="Base" value={`${rate.currency} ${rate.base_amount}`} />
      <Row label="Surcharges" value={`${rate.currency} ${rate.surcharge_amount}`} />
      <div
        className={
          emphasize
            ? "flex items-center justify-between gap-3 pt-1 text-base"
            : "flex items-center justify-between gap-3 pt-1 text-sm"
        }
      >
        <span className="font-medium text-foreground">Total</span>
        <span className="font-bold text-primary">
          {rate.currency} {rate.total_amount}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export interface RateOptionCardProps {
  rate: RateOption;
  onSelect: (rate: RateOption) => void;
}

export function RateOptionCard({ rate, onSelect }: RateOptionCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5 transition-all hover:border-brand-orange/40 hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <Truck aria-hidden className="size-4 text-primary" />
          {rate.integrator_code}
        </span>
        <Badge variant="secondary">{rate.service_code}</Badge>
      </div>

      <div className="space-y-2">
        <Row
          label="Transit"
          value={`${rate.transit_days} day${rate.transit_days === 1 ? "" : "s"}`}
          icon={Clock}
        />
        <Row label="Estimated arrival" value={rate.eta_date} icon={CalendarClock} />
        <Row label="Via" value={rate.via_code} icon={Route} />
      </div>

      <Amounts rate={rate} />

      {/* The whole card is not a button: it holds several lines of text a user
          may want to select, and a click target that wide makes an accidental
          selection easy on a laptop trackpad. */}
      <Button type="button" className="w-full" onClick={() => onSelect(rate)}>
        Select this rate
      </Button>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

export interface RateSummaryCardProps {
  rate: RateOption;
  packageType: string;
  packageTypeLabel?: string;
}

export function RateSummaryCard({
  rate,
  packageType,
  packageTypeLabel,
}: RateSummaryCardProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Truck aria-hidden className="size-4 text-primary" />
            {rate.integrator_code}
          </h2>
          <p className="text-sm text-muted-foreground">
            The rate this request will be created against.
          </p>
        </div>
        <Badge variant="secondary">{rate.service_code}</Badge>
      </div>

      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <Row
          label="Transit"
          value={`${rate.transit_days} day${rate.transit_days === 1 ? "" : "s"}`}
          icon={Clock}
        />
        <Row label="Estimated arrival" value={rate.eta_date} icon={CalendarClock} />
        <Row label="Via" value={rate.via_code} icon={Route} />
        <Row label="Agent" value={rate.agent_code} />
        <Row label="Package type" value={packageTypeLabel || packageType} />
        {rate.surcharge_details.length > 0 ? (
          <Row
            label="Surcharges"
            value={rate.surcharge_details
              .map((surcharge) => `${surcharge.code} (${surcharge.type})`)
              .join(", ")}
          />
        ) : null}
      </div>

      <div className="mt-4">
        <Amounts rate={rate} emphasize />
      </div>
    </Card>
  );
}
