"use client";

import { Coins } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";

import { useConsignmentCharge } from "../_hooks/use-consignment-charges";
import { formatAmount, type ConsignmentCharge } from "../types";

/** One charge, read-only — re-read on open rather than trusting the list row. */
export function ChargeViewDialog({
  consignmentId,
  charge: row,
  open,
  onOpenChange,
}: {
  consignmentId: string;
  charge: ConsignmentCharge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useConsignmentCharge(consignmentId, open ? row?.id : undefined, row ?? undefined);
  const charge = detail.data ?? row;
  const { quantityCodeOptions } = useMetaOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-primary" aria-hidden />
            Charge details
          </DialogTitle>
          <DialogDescription>{charge?.name ?? null}</DialogDescription>
        </DialogHeader>

        {charge ? (
          <div className="space-y-5">
            <Badge variant={charge.is_system_generated === "Y" ? "secondary" : "outline"}>
              {charge.is_system_generated === "Y" ? "System generated" : "Manually added"}
            </Badge>

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Name" value={charge.name} />
              <Detail
                label="Unit"
                value={optionLabel(quantityCodeOptions, charge.quantity_code)}
              />
              <Detail label="Quantity" value={charge.quantity} />
              <Detail label="Rate" value={formatAmount(charge.rate)} />
              <Detail
                label="Amount"
                value={`${formatAmount(charge.amount)} ${charge.currency ?? ""}`.trim()}
              />
              <Detail label="Base currency" value={charge.base_currency} />
              <Detail label="Exchange rate" value={charge.exchange_rate} />
              <div className="sm:col-span-2">
                <Detail label="Description" value={charge.description} />
              </div>
            </dl>
          </div>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">{value?.trim() || "—"}</dd>
    </div>
  );
}
