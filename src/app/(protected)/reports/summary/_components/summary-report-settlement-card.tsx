import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { Scale } from "lucide-react";

import type { SummaryReportSettlement } from "../types";

const LABEL_BY_KEY: Record<string, string> = {
  PENDING: "Pending",
  PARTIALLY_SETTLED: "Partially settled",
  SETTLED: "Settled",
};

const VARIANT_BY_KEY: Record<string, "warning" | "default" | "success" | "secondary"> = {
  PENDING: "warning",
  PARTIALLY_SETTLED: "default",
  SETTLED: "success",
};

function humanizeKey(key: string): string {
  return (
    LABEL_BY_KEY[key] ??
    key
      .replace(/[_-]+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

/** `settlement` is a plain `{ status: count }` map, not an array — rendered the same way the other reports show a status breakdown. */
export function SummaryReportSettlementCard({ settlement }: { settlement: SummaryReportSettlement }) {
  const entries = Object.entries(settlement).filter(([, count]) => typeof count === "number");
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {entries.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No settlement data yet"
            description="Settlement status for this period will appear here once available."
          />
        ) : (
          entries.map(([key, count]) => {
            const share = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <Badge variant={VARIANT_BY_KEY[key] ?? "secondary"}>{humanizeKey(key)}</Badge>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
