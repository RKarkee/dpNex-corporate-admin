import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type { SummaryReportBilling, SummaryReportConsignments } from "../types";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function SummaryConsignmentsCard({ data }: { data: SummaryReportConsignments }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Consignments</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Consignments" value={formatTileValue(data.consignment_count, "integer")} />
        <SummaryRow label="Boxes" value={formatTileValue(data.box_count, "integer")} />
        <SummaryRow label="Total weight" value={formatTileValue(data.total_weight, "weight")} />
        <SummaryRow label="Declared value" value={formatTileValue(data.declared_value, "currency")} />
      </CardContent>
    </Card>
  );
}

export function SummaryBillingCard({ data }: { data: SummaryReportBilling }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Bills" value={formatTileValue(data.invoice_count, "integer")} />
        <SummaryRow label="Gross" value={formatTileValue(data.gross_amount, "currency")} />
        <SummaryRow label="Discount" value={formatTileValue(data.discount_amount, "currency")} />
        <SummaryRow label="Tax" value={formatTileValue(data.tax_amount, "currency")} />
        <SummaryRow label="Net billed" value={formatTileValue(data.net_amount, "currency")} />
        <SummaryRow label="Adjustments" value={formatTileValue(data.adjustments_amount, "currency")} />
        <SummaryRow label="Advance received" value={formatTileValue(data.advance_amount, "currency")} />
        <SummaryRow label="Payable" value={formatTileValue(data.billed_amount, "currency")} />
        <SummaryRow label="Collected" value={formatTileValue(data.collected_amount, "currency")} />
        <SummaryRow label="Outstanding" value={formatTileValue(data.outstanding_amount, "currency")} />
      </CardContent>
    </Card>
  );
}
