"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export interface DashboardDateRange {
  from: string;
  to: string;
}

/**
 * The date range this dashboard reports on.
 *
 * Applied on submit, not on every keystroke — same reasoning as the billing
 * statement's date form: each change here is a real network request, unlike
 * the client-side search filters elsewhere in this app.
 *
 * The endpoint accepts far more filters than this (branch, agent, airline,
 * staff…), but each of those needs its own lookup source the UI does not have
 * yet, so only the range is exposed for now.
 */
export function DashboardFilters({
  from,
  to,
  onApply,
  applying,
}: {
  from: string;
  to: string;
  onApply: (range: DashboardDateRange) => void;
  applying: boolean;
}) {
  const [draftFrom, setDraftFrom] = React.useState(from);
  const [draftTo, setDraftTo] = React.useState(to);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onApply({ from: draftFrom, to: draftTo });
  }

  return (
    <Card className="mb-5">
      <CardContent className="py-5">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="dashboard-from">From</Label>
            <Input
              id="dashboard-from"
              type="date"
              value={draftFrom}
              max={draftTo}
              onChange={(event) => setDraftFrom(event.target.value)}
              required
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <Label htmlFor="dashboard-to">To</Label>
            <Input
              id="dashboard-to"
              type="date"
              value={draftTo}
              min={draftFrom}
              onChange={(event) => setDraftTo(event.target.value)}
              required
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
