"use client";

import * as React from "react";
import { Download, Loader2, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export interface BillingReportDateRange {
  from: string;
  to: string;
}

/**
 * Only the date range is exposed — `group_by` was `null` in the confirmed
 * response and `breakdown` came back empty regardless, so there is nothing
 * confirmed yet to drive with a grouping control.
 *
 * Applied on submit, not on every keystroke, for the same reason as every
 * other report's date range: each change is a real network request.
 */
export function BillingReportFilters({
  value,
  onApply,
  applying,
  onDownload,
  downloading,
}: {
  value: BillingReportDateRange;
  onApply: (value: BillingReportDateRange) => void;
  applying: boolean;
  /** Exports the report for the currently applied range — omit to hide the button. */
  onDownload?: () => void;
  downloading?: boolean;
}) {
  const [draft, setDraft] = React.useState(value);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onApply(draft);
  }

  return (
    <Card className="mb-5">
      <CardContent className="py-5">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="billing-report-from">From</Label>
            <Input
              id="billing-report-from"
              type="date"
              value={draft.from}
              max={draft.to}
              onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
              required
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="billing-report-to">To</Label>
            <Input
              id="billing-report-to"
              type="date"
              value={draft.to}
              min={draft.from}
              onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
              required
            />
          </div>

          <Button type="submit" disabled={applying}>
            <Search className="size-4" />
            Apply
          </Button>

          {onDownload ? (
            <Button type="button" variant="outline" onClick={onDownload} disabled={downloading}>
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
