"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
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

import { StatCard, type StatTone } from "../../../_components/stat-card";
import { InvoiceStatusBadge } from "../../_components/invoice-status-badge";
import { PaymentStatusBadge } from "../../_components/payment-status-badge";
import { formatEnumLabel, formatInvoiceAmount, formatInvoiceDate } from "../../_lib/format-invoice";
import type { BillingStatement } from "../../types";

const TONES: StatTone[] = ["navy", "crimson", "orange", "navy", "crimson"];

export interface StatementResultsProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  statement: BillingStatement | undefined;
}

/**
 * The statement itself: opening/closing balance and the period totals above
 * two tables — the invoices billed in range and the payments received in
 * range. Two separate lists rather than one merged ledger, matching the
 * shape the API actually sends (see `types.ts`) rather than the running-
 * balance ledger this page guessed at before that shape was confirmed.
 */
export function StatementResults({ isPending, isError, error, onRetry, statement }: StatementResultsProps) {
  if (isPending) return <StatementResultsSkeleton />;

  if (isError || !statement) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Could not load the statement
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {isApiError(error) ? error.message : "Something went wrong. Please try again."}
        </p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      </Card>
    );
  }

  // Not on the statement itself — each invoice row carries its own, and a
  // corporate is assumed to bill in one currency, so the first row's is used
  // for the balance figures too. `null` (nothing billed this period) falls
  // back to a plain number.
  const currency = statement.invoices[0]?.currency ?? null;

  return (
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
                      <Link
                        href={`/billing-accounts/${invoice.id}`}
                        className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {invoice.invoice_no}
                      </Link>
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
                      {/* Carries the dropped columns on small screens. */}
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
  );
}

function StatementResultsSkeleton() {
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
