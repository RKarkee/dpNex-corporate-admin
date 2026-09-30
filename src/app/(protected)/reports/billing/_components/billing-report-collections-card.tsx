import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type { BillingReportCollections } from "../types";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function BillingReportCollectionsCard({ collections }: { collections: BillingReportCollections }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        <SummaryRow label="Payments" value={formatTileValue(collections.payment_count, "integer")} />
        <SummaryRow label="Received" value={formatTileValue(collections.received_amount, "currency")} />
        <SummaryRow label="Allocated" value={formatTileValue(collections.allocated_amount, "currency")} />
        <SummaryRow label="Unallocated" value={formatTileValue(collections.unallocated_amount, "currency")} />
      </CardContent>
    </Card>
  );
}
