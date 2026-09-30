import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import { LayoutGrid } from "lucide-react";

import { DashboardStatusBadge } from "./dashboard-status-badge";
import type { DashboardStatusCount } from "../types";

export function DashboardStatuses({ statuses }: { statuses: DashboardStatusCount[] }) {
  if (statuses.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No status breakdown yet"
        description="Consignment statuses for this period will appear here once available."
      />
    );
  }

  const total = statuses.reduce((sum, row) => sum + (row.consignment_count || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consignments by status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {statuses.map((row) => {
          const share = total > 0 ? Math.round((row.consignment_count / total) * 100) : 0;
          return (
            <div key={row.status} className="flex items-center gap-3">
              <DashboardStatusBadge status={row.status} />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${share}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                {row.consignment_count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
