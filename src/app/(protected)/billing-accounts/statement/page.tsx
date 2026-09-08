"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Search } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { useBillingStatement } from "../_hooks/use-billing-statement";
import { downloadCsv } from "../_lib/csv";
import { safeFileName } from "../_lib/download-file";
import { StatementResults } from "./_components/statement-results";

/** `Date` → `YYYY-MM-DD`, what both the `<input type="date">` and the API want. */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29); // a trailing 30 days, inclusive of today
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

/**
 * No `RequirePermission` wrapper — same reasoning as the rest of this
 * section: permission names for this resource are unconfirmed, and the API
 * still scopes every call to the caller's own corporate.
 *
 * The date range is applied on submit, not on every keystroke in the date
 * inputs — each change here is a real network request, unlike the client-side
 * search filters elsewhere in this app.
 */
export default function BillingStatementPage() {
  const initial = React.useMemo(() => defaultRange(), []);

  const [draftFrom, setDraftFrom] = React.useState(initial.from);
  const [draftTo, setDraftTo] = React.useState(initial.to);
  const [range, setRange] = React.useState(initial);

  const query = useBillingStatement(range.from, range.to);
  const statement = query.data;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setRange({ from: draftFrom, to: draftTo });
  }

  function handleDownloadCsv() {
    if (!statement) return;

    const rows: (string | number | null)[][] = [
      ["Statement", statement.period.from, statement.period.to],
      ["Opening balance", statement.opening_balance],
      ["Billed", statement.totals.billed],
      ["Paid", statement.totals.paid],
      ["Outstanding", statement.totals.outstanding],
      ["Closing balance", statement.closing_balance],
      [],
      ["Invoices"],
      ["Invoice No", "Invoice Date", "Due Date", "Status", "Net Amount", "Paid Amount", "Outstanding Amount"],
      ...statement.invoices.map((invoice) => [
        invoice.invoice_no,
        invoice.invoice_date,
        invoice.due_date,
        invoice.status,
        invoice.net_amount,
        invoice.paid_amount,
        invoice.outstanding_amount,
      ]),
      [],
      ["Payments"],
      ["Payment Date", "Channel", "Source", "Transaction ID", "Status", "Amount"],
      ...statement.payments.map((payment) => [
        payment.payment_date,
        payment.payment_channel,
        payment.payment_source,
        payment.transaction_id,
        payment.status,
        payment.amount,
      ]),
    ];

    downloadCsv(rows, safeFileName(`statement-${range.from}-to-${range.to}`, "csv"));
  }

  return (
    <>
      <PageHeader
        title="Bill Statement"
        description="Invoices and payments on your billing account for a date range."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/billing-accounts">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            <Button className="flex-1 sm:flex-none" disabled={!statement} onClick={handleDownloadCsv}>
              <Download className="size-4" />
              Download CSV
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <CardContent className="py-5">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3"
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="statement-from">From</Label>
              <Input
                id="statement-from"
                type="date"
                value={draftFrom}
                max={draftTo}
                onChange={(event) => setDraftFrom(event.target.value)}
                required
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <Label htmlFor="statement-to">To</Label>
              <Input
                id="statement-to"
                type="date"
                value={draftTo}
                min={draftFrom}
                onChange={(event) => setDraftTo(event.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={query.isFetching}>
              <Search className="size-4" />
              View statement
            </Button>
          </form>
        </CardContent>
      </Card>

      <StatementResults
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        statement={statement}
      />
    </>
  );
}
