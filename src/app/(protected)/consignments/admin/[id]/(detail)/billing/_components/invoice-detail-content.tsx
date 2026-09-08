"use client";

import * as React from "react";
import { Calendar, CalendarClock } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
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
import { cn } from "@/shared/lib/utils";

import {
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoiceNumber,
} from "../_lib/format-invoice";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import type { Invoice, InvoiceLine, InvoiceParty } from "../types";

/**
 * The full bill: header totals, the two parties, shipment reference facts,
 * the charge lines, the totals breakdown and any payments already applied.
 *
 * Standalone sibling of `billing-accounts/[id]/_components/invoice-detail.tsx`
 * — laid out for a dialog body here rather than a page (no shipment/tracking
 * line, since every invoice in this tab already belongs to the one
 * consignment the dialog was opened from).
 */
export function InvoiceDetailContent({ invoice }: { invoice: Invoice }) {
  const lines = invoice.details ?? [];
  const infoLines = lines.filter((line) => line.is_monetary !== "Y");
  const chargeLines = lines.filter((line) => line.is_monetary === "Y");
  const allocations = invoice.allocations ?? [];

  const amounts = invoice.amounts;
  const outstanding = Number(amounts.outstanding);
  const hasDiscount = Number(amounts.discount) !== 0;
  const hasTax = Number(amounts.tax) !== 0;
  const hasAdjustments = Number(amounts.adjustments) !== 0;
  const hasAdvance = Number(amounts.advance) !== 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-5 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Invoice</p>
            <h2 className="text-xl font-bold text-foreground">{invoice.invoice_no}</h2>
            <InvoiceStatusBadge status={invoice.status} label={invoice.status_label} />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:text-right">
            <Field icon={Calendar} label="Invoice date">
              {formatInvoiceDate(invoice.invoice_date)}
            </Field>
            <Field icon={CalendarClock} label="Due date">
              {formatInvoiceDate(invoice.due_date)}
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <PartyCard title="Issued by" party={invoice.issuer} />
        <PartyCard title="Billed to" party={invoice.buyer} />
      </div>

      {infoLines.length > 0 ? (
        <Card>
          <CardContent className="py-6">
            <SectionHeading>Shipment details</SectionHeading>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {infoLines.map((line) => (
                <div key={line.id}>
                  <dt className="text-sm text-muted-foreground">{line.particular}</dt>
                  <dd className="font-medium text-foreground">
                    {line.display_value?.trim() || "—"}
                    {line.quantity_code ? ` ${line.quantity_code}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {chargeLines.length > 0 ? <ChargesTable lines={chargeLines} currency={invoice.currency} /> : null}

      <Card>
        <CardContent className="py-6">
          <SectionHeading>Summary</SectionHeading>
          <div className="ml-auto max-w-xs space-y-2">
            <TotalRow label="Gross">{formatInvoiceAmount(amounts.gross, invoice.currency)}</TotalRow>
            {hasDiscount ? (
              <TotalRow label="Discount">
                −{formatInvoiceAmount(amounts.discount, invoice.currency)}
              </TotalRow>
            ) : null}
            {hasTax ? (
              <TotalRow label="Tax">{formatInvoiceAmount(amounts.tax, invoice.currency)}</TotalRow>
            ) : null}
            {hasAdjustments ? (
              <TotalRow label="Adjustments">
                {formatInvoiceAmount(amounts.adjustments, invoice.currency)}
              </TotalRow>
            ) : null}
            {hasAdvance ? (
              <TotalRow label="Advance">
                −{formatInvoiceAmount(amounts.advance, invoice.currency)}
              </TotalRow>
            ) : null}

            <Separator className="my-2" />

            <TotalRow label="Payable" emphasize>
              {formatInvoiceAmount(amounts.payable, invoice.currency)}
            </TotalRow>
            <TotalRow label="Paid">{formatInvoiceAmount(amounts.paid, invoice.currency)}</TotalRow>
            <TotalRow label="Outstanding" emphasize destructive={outstanding > 0}>
              {formatInvoiceAmount(amounts.outstanding, invoice.currency)}
            </TotalRow>
          </div>
        </CardContent>
      </Card>

      {allocations.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border p-4">
              <h3 className="text-base font-semibold text-foreground">Payments applied</h3>
            </div>
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-card hover:bg-transparent">
                    <TableHead>Payment</TableHead>
                    <TableHead className="hidden sm:table-cell">Applied on</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow key={allocation.id} className="bg-card">
                      <TableCell className="font-medium text-foreground">
                        #{allocation.payment_id}
                        <p className="text-xs font-normal text-muted-foreground sm:hidden">
                          {formatInvoiceDate(allocation.allocated_on)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatInvoiceDate(allocation.allocated_on)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatInvoiceAmount(allocation.amount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {invoice.payment_terms?.trim() ? (
        <Card>
          <CardContent className="py-6">
            <SectionHeading>Payment terms</SectionHeading>
            <p className="text-sm text-muted-foreground">{invoice.payment_terms}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ChargesTable({ lines, currency }: { lines: InvoiceLine[]; currency: string }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border p-4">
          <h3 className="text-base font-semibold text-foreground">Charges</h3>
        </div>
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-card hover:bg-transparent">
                <TableHead>Particular</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Qty</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {lines.length === 0 ? (
                <TableEmpty colSpan={4}>No charges on this invoice.</TableEmpty>
              ) : null}

              {lines.map((line) => {
                const hasQuantity = Number(line.quantity) !== 0;

                return (
                  <TableRow key={line.id} className="bg-card">
                    <TableCell className="max-w-xs">
                      <p className="truncate font-medium text-foreground">{line.particular}</p>
                      {line.description ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {line.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                      {hasQuantity
                        ? `${formatInvoiceNumber(line.quantity)}${line.quantity_code ? ` ${line.quantity_code}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                      {hasQuantity ? formatInvoiceAmount(line.rate, currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatInvoiceAmount(line.amount, currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PartyCard({ title, party }: { title: string; party: InvoiceParty | null | undefined }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-6">
        <SectionHeading>{title}</SectionHeading>
        {party?.name ? (
          <>
            <p className="font-medium text-foreground">{party.name}</p>
            {party.tagline ? (
              <p className="text-sm text-muted-foreground">{party.tagline}</p>
            ) : null}
            {party.address ? (
              <p className="text-sm text-muted-foreground">{party.address}</p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
              {party.email ? <span>{party.email}</span> : null}
              {party.phone ? <span>{party.phone}</span> : null}
              {party.contact ? <span>{party.contact}</span> : null}
              {party.website ? (
                <a
                  href={party.website}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary hover:underline"
                >
                  {party.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
            {party.account || party.pan || party.vat ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {party.account ? <Badge variant="secondary">Acct {party.account}</Badge> : null}
                {party.pan ? <Badge variant="secondary">PAN {party.pan}</Badge> : null}
                {party.vat ? <Badge variant="secondary">VAT {party.vat}</Badge> : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 border-b border-border pb-2 text-base font-semibold text-foreground">
      {children}
    </h3>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground sm:justify-end">
        <Icon aria-hidden className="size-4" />
        {label}
      </span>
      <p className="font-medium text-foreground">{children}</p>
    </div>
  );
}

function TotalRow({
  label,
  emphasize = false,
  destructive = false,
  children,
}: {
  label: string;
  emphasize?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={cn(
          "text-sm text-muted-foreground",
          emphasize && "font-medium text-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums text-foreground",
          emphasize && "text-base font-semibold",
          destructive && "text-destructive",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** The same section layout with the values blanked. */
export function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="ml-auto h-4 w-20" />
                <Skeleton className="ml-auto h-5 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-2 py-6">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
