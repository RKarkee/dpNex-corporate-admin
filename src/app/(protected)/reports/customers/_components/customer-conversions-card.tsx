import { Info, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import type { CustomerReportConversions } from "../types";

/**
 * `conversions.supported` is itself part of the report — a corporate
 * (non-internal) caller gets `supported: false` with a `reason` rather than
 * an error or a missing section, so this renders that as a plain notice.
 *
 * No response with `supported: true` has been seen yet, so the "supported"
 * branch stays defensive: it lists whatever extra fields the endpoint sends
 * rather than assuming a fixed shape.
 */
export function CustomerConversionsCard({ conversions }: { conversions: CustomerReportConversions }) {
  if (!conversions.supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start gap-3 rounded-lg bg-secondary/60 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {conversions.reason ?? "Conversion reporting is not available for this account."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const extraEntries = Object.entries(conversions).filter(
    ([key]) => key !== "supported" && key !== "reason",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {extraEntries.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg bg-secondary/60 p-4">
            <TrendingUp className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Conversion reporting is available for this account.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {extraEntries.map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                <span className="text-muted-foreground">{key.replace(/[_-]+/g, " ")}</span>
                <span className="font-semibold tabular-nums text-foreground">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
