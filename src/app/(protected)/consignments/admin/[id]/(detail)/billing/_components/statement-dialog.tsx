"use client";

import * as React from "react";
import { CalendarRange, Download, Search, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

import { StatCard, type StatTone } from "@/app/(protected)/_components/stat-card";
import { useConsignmentBillingStatement } from "../_hooks/use-consignment-billing-statement";
import { safeFileName } from "../_lib/download-file";
import { formatEnumLabel, formatInvoiceAmount, formatInvoiceDate } from "../_lib/format-invoice";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { PaymentStatusBadge } from "./payment-status-badge";
import { downloadCsv } from "@/shared/lib/csv";

const TONES: StatTone[] = ["navy", "crimson", "orange", "navy", "crimson"];

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
 * The bill statement for this consignment, in a dialog rather than a
 * separate page — this tab follows the same Documents/Boxes convention the
 * invoice detail view uses, so a "different page" for the corporate-wide
 * statement (see `billing-accounts/statement/page.tsx`) becomes a
 * "different view" here instead, without leaving the tab.
 *
 * The date range is applied on submit, not on every keystroke — each change
 * is a real network request.
 */
export function StatementDialog({
  consignmentId,
  open,
  onOpenChange,
}: {
  consignmentId: number | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const initial = React.useMemo(() => defaultRange(), []);

  const [draftFrom, setDraftFrom] = React.useState(initial.from);
  const [draftTo, setDraftTo] = React.useState(initial.to);
  const [range, setRange] = React.useState(initial);

  const query = useConsignmentBillingStatement(consignmentId, range.from, range.to);
  const statement = query.data;
  const currency = statement?.invoices[0]?.currency ?? null;

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

    downloadCsv(rows, safeFileName(`consignment-${consignmentId}-statement-${range.from}-to-${range.to}`, "csv"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="size-5 text-primary" aria-hidden />
            Bill statement
          </DialogTitle>
          <DialogDescription>
            Invoices and payments on this consignment for a date range.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="py-5">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3"
            >
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="consignment-statement-from">From</Label>
                <Input
                  id="consignment-statement-from"
                  type="date"
                  value={draftFrom}
                  max={draftTo}
                  onChange={(event) => setDraftFrom(event.target.value)}
                  required
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <Label htmlFor="consignment-statement-to">To</Label>
                <Input
                  id="consignment-statement-to"
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

              <Button type="button" variant="outline" disabled={!statement} onClick={handleDownloadCsv}>
                <Download className="size-4" />
                Download CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        {query.isPending ? (
          <StatementSkeleton />
        ) : query.isError || !statement ? (
          <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Could not load the statement
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {isApiError(query.error) ? query.error.message : "Something went wrong. Please try again."}
            </p>
            <Button variant="outline" className="mt-6" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </Card>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                label="Opening balance"
                value={formatInvoiceAmount(statement.opening_balance, currency)}
                hint="Start of period"
                tone={TONES[0]}
              />
              <StatCard
                label="Billed"
                value={formatInvoiceAmount(statement.totals.billed, currency)}
                hint="Invoiced this period"
                tone={TONES[1]}
              />
              <StatCard
                label="Paid"
                value={formatInvoiceAmount(statement.totals.paid, currency)}
                hint="Received this period"
                tone={TONES[2]}
              />
              <StatCard
                label="Outstanding"
                value={formatInvoiceAmount(statement.totals.outstanding, currency)}
                hint="Still unpaid"
                tone={TONES[3]}
              />
              <StatCard
                label="Closing balance"
                value={formatInvoiceAmount(statement.closing_balance, currency)}
                hint="End of period"
                tone={TONES[4]}
              />
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border p-4">
                  <h3 className="text-base font-semibold text-foreground">Invoices</h3>
                </div>
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-card hover:bg-transparent">
                        <TableHead>Invoice</TableHead>
                        <TableHead className="hidden sm:table-cell">Due date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Paid</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.invoices.length === 0 ? (
                        <TableEmpty colSpan={5}>No invoices in this period.</TableEmpty>
                      ) : null}

                      {statement.invoices.map((invoice) => (
                        <TableRow key={invoice.id} className="bg-card">
                          <TableCell className="max-w-40 sm:max-w-xs">
                            <p className="truncate font-medium text-foreground">{invoice.invoice_no}</p>
                            <p className="text-xs text-muted-foreground">
                              Billed {formatInvoiceDate(invoice.invoice_date)}
                            </p>
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                            {formatInvoiceDate(invoice.due_date)}
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                            {formatInvoiceAmount(invoice.paid_amount, invoice.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-foreground">
                            {formatInvoiceAmount(invoice.outstanding_amount, invoice.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="border-b border-border p-4">
                  <h3 className="text-base font-semibold text-foreground">Payments</h3>
                </div>
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-card hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden sm:table-cell">Channel</TableHead>
                        <TableHead className="hidden text-muted-foreground md:table-cell">
                          Transaction
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.payments.length === 0 ? (
                        <TableEmpty colSpan={5}>No payments in this period.</TableEmpty>
                      ) : null}

                      {statement.payments.map((payment) => (
                        <TableRow key={payment.id} className="bg-card">
                          <TableCell className="whitespace-nowrap text-foreground">
                            {formatInvoiceDate(payment.payment_date)}
                            <p className="text-xs font-normal text-muted-foreground sm:hidden">
                              {formatEnumLabel(payment.payment_channel)}
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {formatEnumLabel(payment.payment_channel)}
                            {payment.payment_source ? (
                              <p className="text-xs">{formatEnumLabel(payment.payment_source)}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {payment.transaction_id ?? "—"}
                          </TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={payment.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-foreground">
                            {formatInvoiceAmount(payment.amount, currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatementSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card key={index} className="p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-9 w-20" />
            <Skeleton className="mt-3 h-4 w-16" />
          </Card>
        ))}
      </div>

      {Array.from({ length: 2 }, (_, section) => (
        <Card key={section} className="overflow-hidden">
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }, (_, row) => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
