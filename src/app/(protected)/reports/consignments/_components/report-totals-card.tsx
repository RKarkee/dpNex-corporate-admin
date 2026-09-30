import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type { ConsignmentReportTotals } from "../types";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function ReportTotalsCard({ totals }: { totals: ConsignmentReportTotals }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Consignments" value={formatTileValue(totals.consignment_count, "integer")} />
        <SummaryRow label="Boxes" value={formatTileValue(totals.box_count, "integer")} />
        <SummaryRow label="Total weight" value={formatTileValue(totals.total_weight, "weight")} />
        <SummaryRow label="Declared value" value={formatTileValue(totals.declared_value, "currency")} />
      </CardContent>
    </Card>
  );
}
