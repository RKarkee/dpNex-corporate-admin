import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatTileValue } from "../_lib/format-tile";
import type {
  DashboardBilling,
  DashboardCollections,
  DashboardConsignments,
  DashboardRequests,
} from "../types";

/**
 * One row inside a summary card: a label on the left, a formatted value on
 * the right. Every summary card below is built from a list of these, rather
 * than four near-identical hand-written layouts.
 */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function SummaryCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 pt-0">
        {rows.map((row) => (
          <SummaryRow key={row.label} label={row.label} value={row.value} />
        ))}
      </CardContent>
    </Card>
  );
}

export function ConsignmentsSummaryCard({ data }: { data: DashboardConsignments }) {
  return (
    <SummaryCard
      title="Consignments"
      rows={[
        { label: "Consignments", value: formatTileValue(data.consignment_count, "integer") },
        { label: "Boxes", value: formatTileValue(data.box_count, "integer") },
        { label: "Total weight", value: formatTileValue(data.total_weight, "weight") },
        { label: "Declared value", value: formatTileValue(data.declared_value, "currency") },
      ]}
    />
  );
}

export function BillingSummaryCard({ data }: { data: DashboardBilling }) {
  return (
    <SummaryCard
      title="Billing"
      rows={[
        { label: "Invoices", value: formatTileValue(data.invoice_count, "integer") },
        { label: "Gross amount", value: formatTileValue(data.gross_amount, "currency") },
        { label: "Discount", value: formatTileValue(data.discount_amount, "currency") },
        { label: "Tax", value: formatTileValue(data.tax_amount, "currency") },
        { label: "Net amount", value: formatTileValue(data.net_amount, "currency") },
        { label: "Adjustments", value: formatTileValue(data.adjustments_amount, "currency") },
        { label: "Advance received", value: formatTileValue(data.advance_amount, "currency") },
        { label: "Billed", value: formatTileValue(data.billed_amount, "currency") },
        { label: "Collected", value: formatTileValue(data.collected_amount, "currency") },
        { label: "Outstanding", value: formatTileValue(data.outstanding_amount, "currency") },
      ]}
    />
  );
}

export function RequestsSummaryCard({ data }: { data: DashboardRequests }) {
  return (
    <SummaryCard
      title="Requests"
      rows={[
        { label: "Total", value: formatTileValue(data.total, "integer") },
        { label: "Pending", value: formatTileValue(data.pending, "integer") },
        { label: "Approved", value: formatTileValue(data.approved, "integer") },
        { label: "Rejected", value: formatTileValue(data.rejected, "integer") },
        { label: "Needs modification", value: formatTileValue(data.modification_required, "integer") },
        { label: "Assigned", value: formatTileValue(data.assigned, "integer") },
        { label: "Unassigned", value: formatTileValue(data.unassigned, "integer") },
        { label: "Boxes", value: formatTileValue(data.box_count, "integer") },
        { label: "Converted", value: formatTileValue(data.converted, "integer") },
        {
          label: "Conversion rate",
          value:
            data.conversion_rate === null || data.conversion_rate === undefined
              ? "—"
              : `${data.conversion_rate.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`,
        },
      ]}
    />
  );
}

export function CollectionsSummaryCard({ data }: { data: DashboardCollections }) {
  return (
    <SummaryCard
      title="Collections"
      rows={[
        { label: "Payments", value: formatTileValue(data.payment_count, "integer") },
        { label: "Received", value: formatTileValue(data.received_amount, "currency") },
        { label: "Allocated", value: formatTileValue(data.allocated_amount, "currency") },
        { label: "Unallocated", value: formatTileValue(data.unallocated_amount, "currency") },
      ]}
    />
  );
}
