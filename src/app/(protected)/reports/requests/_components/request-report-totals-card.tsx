import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type { RequestReportTotals } from "../types";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function RequestReportTotalsCard({ totals }: { totals: RequestReportTotals }) {
  const int = (value: number) => formatTileValue(value, "integer");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Total" value={int(totals.total)} />
        <SummaryRow label="Pending" value={int(totals.pending)} />
        <SummaryRow label="Approved" value={int(totals.approved)} />
        <SummaryRow label="Rejected" value={int(totals.rejected)} />
        <SummaryRow label="Needs modification" value={int(totals.modification_required)} />
        <SummaryRow label="Assigned" value={int(totals.assigned)} />
        <SummaryRow label="Unassigned" value={int(totals.unassigned)} />
        <SummaryRow label="Boxes" value={int(totals.box_count)} />
        <SummaryRow label="Converted" value={int(totals.converted)} />
        <SummaryRow label="Conversion rate" value={formatTileValue(totals.conversion_rate, "percent")} />
      </CardContent>
    </Card>
  );
}
