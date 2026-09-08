import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type { BillingStatement } from "../types";

/**
 * `/corporate/billing/statement` — a period summary of activity on this
 * corporate's billing account, plus the invoices and payments inside it.
 *
 * Confirmed against a live response: the object sits at `data.statement`,
 * unlike the invoice endpoints' plural-key quirk — this one isn't a list of
 * a resource, so there's no plural to disagree about.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Picks the statement object out of the envelope — `data.statement`, confirmed. */
function readStatement(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [data?.statement, data, raw.statement, raw];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return null;
}

/**
 * Fills in the fields the page dereferences directly (`totals.billed`,
 * `invoices.map(...)`) so a payload missing one of them renders as empty
 * rather than throwing — everything else rides through via `...record`.
 */
function normalizeStatement(record: Record<string, unknown>): BillingStatement {
  return {
    ...record,
    period: isRecord(record.period) ? (record.period as BillingStatement["period"]) : { from: "", to: "" },
    opening_balance: typeof record.opening_balance === "string" ? record.opening_balance : "0.0000",
    closing_balance: typeof record.closing_balance === "string" ? record.closing_balance : "0.0000",
    totals: isRecord(record.totals)
      ? (record.totals as BillingStatement["totals"])
      : { billed: "0.0000", paid: "0.0000", outstanding: "0.0000" },
    invoices: Array.isArray(record.invoices)
      ? (record.invoices.filter(isRecord) as BillingStatement["invoices"])
      : [],
    payments: Array.isArray(record.payments)
      ? (record.payments.filter(isRecord) as BillingStatement["payments"])
      : [],
  };
}

export interface BillingStatementParams {
  /** `YYYY-MM-DD`. */
  from: string;
  /** `YYYY-MM-DD`. */
  to: string;
  signal?: AbortSignal;
}

export async function fetchBillingStatement({
  from,
  to,
  signal,
}: BillingStatementParams): Promise<BillingStatement> {
  const raw = await privateApiClient.get<unknown>("/corporate/billing/statement", {
    params: { from, to },
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal,
  });

  const record = readStatement(raw);
  if (!record) throw new ApiError(502, "The statement could not be generated. Please try again.");

  return normalizeStatement(record);
}
