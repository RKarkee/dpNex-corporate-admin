import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type { CustomerReportTotals } from "../types";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function CustomerReportTotalsCard({ totals }: { totals: CustomerReportTotals }) {
  const int = (value: number) => formatTileValue(value, "integer");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Total" value={int(totals.total)} />
        <SummaryRow label="Leads" value={int(totals.leads)} />
        <SummaryRow label="Customers" value={int(totals.customers)} />
        <SummaryRow label="TCustomers" value={int(totals.tcustomers)} />
        <SummaryRow label="Individual" value={int(totals.individual)} />
        <SummaryRow label="Corporate" value={int(totals.corporate)} />
        <SummaryRow label="Individual leads" value={int(totals.individual_leads)} />
        <SummaryRow label="Corporate leads" value={int(totals.corporate_leads)} />
        <SummaryRow label="Individual customers" value={int(totals.individual_customers)} />
        <SummaryRow label="Corporate customers" value={int(totals.corporate_customers)} />
        <SummaryRow label="Converted" value={int(totals.converted)} />
      </CardContent>
    </Card>
  );
}
