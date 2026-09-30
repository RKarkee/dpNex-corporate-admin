"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { NativeSelect } from "@/shared/components/ui/native-select";

export interface SummaryReportFilterValues {
  from: string;
  to: string;
  groupBy: string;
}

/**
 * Unlike the other reports, `group_by` is confirmed live here — the sample
 * response grouped by `"COUNTRY"`. The rest of the options are the same
 * dimension-shaped filter fields offered on the Consignment report, since
 * the same fields (`via`, `status`, `agent`, `airline`, `country`,
 * `customer_class`, `customer_kind`, `module`) are what this endpoint's own
 * `filters` object lists.
 *
 * Applied on submit, not on every keystroke — each change here is a real
 * network request.
 */
const GROUP_BY_OPTIONS = [
  { value: "COUNTRY", label: "Country" },
  { value: "VIA", label: "Via" },
  { value: "STATUS", label: "Status" },
  { value: "BRANCH", label: "Branch" },
  { value: "AGENT", label: "Agent" },
  { value: "AIRLINE", label: "Airline" },
  { value: "CUSTOMER_CLASS", label: "Customer class" },
  { value: "CUSTOMER_KIND", label: "Customer kind" },
  { value: "MODULE", label: "Module" },
];

export function SummaryReportFilters({
  value,
  onApply,
  applying,
}: {
  value: SummaryReportFilterValues;
  onApply: (value: SummaryReportFilterValues) => void;
  applying: boolean;
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
            <Label htmlFor="summary-report-from">From</Label>
            <Input
              id="summary-report-from"
              type="date"
              value={draft.from}
              max={draft.to}
              onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
              required
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="summary-report-to">To</Label>
            <Input
              id="summary-report-to"
              type="date"
              value={draft.to}
              min={draft.from}
              onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
              required
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="summary-report-group-by">Group by</Label>
            <NativeSelect
              id="summary-report-group-by"
              options={GROUP_BY_OPTIONS}
              value={draft.groupBy}
              onChange={(event) => setDraft((prev) => ({ ...prev, groupBy: event.target.value }))}
            />
          </div>

          <Button type="submit" disabled={applying}>
            <Search className="size-4" />
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
