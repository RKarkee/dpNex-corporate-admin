import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type { BillingReportAdjustments } from "../types";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function BillingReportAdjustmentsCard({ adjustments }: { adjustments: BillingReportAdjustments }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjustments</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Adjustments" value={formatTileValue(adjustments.adjustment_count, "integer")} />
        <SummaryRow label="Debits" value={formatTileValue(adjustments.debit_amount, "currency")} />
        <SummaryRow label="Credits" value={formatTileValue(adjustments.credit_amount, "currency")} />
        <SummaryRow label="Net" value={formatTileValue(adjustments.net_amount, "currency")} />
      </CardContent>
    </Card>
  );
}
