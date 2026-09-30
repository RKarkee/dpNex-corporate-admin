"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { NativeSelect } from "@/shared/components/ui/native-select";

export interface ReportFilterValues {
  from: string;
  to: string;
  groupBy: string;
}

/**
 * Only the dimensions confirmed by a real response are exposed as controls
 * — the date range and `group_by` (the sample response used `"VIA"`). The
 * options below are the filter fields the endpoint's own `filters` object
 * already lists as dimension-shaped (`via`, `status`, `agent`, `airline`,
 * `country`, `customer_class`, `customer_kind`, `module`), offered as
 * plausible groupings; the backend is the source of truth for which ones it
 * actually accepts.
 *
 * Applied on submit, not on every keystroke — each change here is a real
 * network request, same reasoning as the dashboard's own date range.
 */
const GROUP_BY_OPTIONS = [
  { value: "VIA", label: "Via" },
  { value: "STATUS", label: "Status" },
  { value: "BRANCH", label: "Branch" },
  { value: "AGENT", label: "Agent" },
  { value: "AIRLINE", label: "Airline" },
  { value: "COUNTRY", label: "Country" },
  { value: "CUSTOMER_CLASS", label: "Customer class" },
  { value: "CUSTOMER_KIND", label: "Customer kind" },
  { value: "MODULE", label: "Module" },
];

export function ReportFilters({
  value,
  onApply,
  applying,
}: {
  value: ReportFilterValues;
  onApply: (value: ReportFilterValues) => void;
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
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={draft.from}
              max={draft.to}
              onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
              required
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              value={draft.to}
              min={draft.from}
              onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
              required
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="report-group-by">Group by</Label>
            <NativeSelect
              id="report-group-by"
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
