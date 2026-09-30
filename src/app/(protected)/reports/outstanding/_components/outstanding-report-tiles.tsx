import { StatCard } from "../../../_components/stat-card";
import { formatTileValue } from "../_lib/format-tile";
import type { OutstandingReportTotals } from "../types";

/**
 * This endpoint returns no `tiles` array (unlike the dashboard and the
 * other reports) — the headline figures come straight off `totals`, so
 * these four cards are built from it directly rather than mapping over a
 * server-provided list.
 */
export function OutstandingReportTiles({ totals }: { totals: OutstandingReportTotals }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Bills"
        value={formatTileValue(totals.invoice_count, "integer")}
        hint="Invoices in this period"
        tone="navy"
      />
      <StatCard
        label="Billed"
        value={formatTileValue(totals.billed_amount, "currency")}
        hint="Total payable"
        tone="navy"
      />
      <StatCard
        label="Collected"
        value={formatTileValue(totals.collected_amount, "currency")}
        hint="Received against bills"
        tone="orange"
      />
      <StatCard
        label="Outstanding"
        value={formatTileValue(totals.outstanding_amount, "currency")}
        hint="Still to be collected"
        tone="crimson"
      />
    </div>
  );
}
