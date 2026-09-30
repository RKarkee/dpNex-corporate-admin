import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type { OutstandingReportTotals } from "../types";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function OutstandingReportTotalsCard({ totals }: { totals: OutstandingReportTotals }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Bills" value={formatTileValue(totals.invoice_count, "integer")} />
        <SummaryRow label="Gross" value={formatTileValue(totals.gross_amount, "currency")} />
        <SummaryRow label="Discount" value={formatTileValue(totals.discount_amount, "currency")} />
        <SummaryRow label="Tax" value={formatTileValue(totals.tax_amount, "currency")} />
        <SummaryRow label="Net billed" value={formatTileValue(totals.net_amount, "currency")} />
        <SummaryRow label="Adjustments" value={formatTileValue(totals.adjustments_amount, "currency")} />
        <SummaryRow label="Advance received" value={formatTileValue(totals.advance_amount, "currency")} />
        <SummaryRow label="Payable" value={formatTileValue(totals.billed_amount, "currency")} />
        <SummaryRow label="Collected" value={formatTileValue(totals.collected_amount, "currency")} />
        <SummaryRow label="Outstanding" value={formatTileValue(totals.outstanding_amount, "currency")} />
      </CardContent>
    </Card>
  );
}
