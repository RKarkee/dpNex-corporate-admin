import type { BillingSummary } from "../services/billing-summary.service";

/**
 * Turns an unconfirmed `/corporate/billing/summary` payload into something a
 * page can render without knowing its exact field names ahead of time.
 *
 * Every top-level scalar (a number, or a numeric string like the decimal
 * strings the invoice endpoints use) becomes a stat card; every top-level
 * array of records becomes a breakdown table. Anything else — booleans,
 * blank strings, nested objects that aren't arrays — is left out rather than
 * guessed at, the same restraint `readInvoices` uses for an unrecognised
 * envelope shape: show what can be shown honestly, nothing invented.
 */

export interface SummaryStat {
  key: string;
  label: string;
  value: string | number;
  isMoney: boolean;
}

export interface SummaryBreakdownRow {
  label: string;
  count: string | number | null;
  amount: string | number | null;
}

export interface SummaryBreakdown {
  key: string;
  label: string;
  rows: SummaryBreakdownRow[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumeric(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim() !== "" && Number.isFinite(Number(value));
  return false;
}

/** `"total_outstanding"` → `"Total Outstanding"`. */
function titleCase(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Checked before `MONEY_HINTS`: a key like `total_invoices` contains "total"
 * but is a count, not an amount, and would otherwise be formatted as
 * currency by that hint alone.
 */
const COUNT_HINTS = ["count", "invoices", "bills", "qty", "quantity", "number"];
const MONEY_HINTS = [
  "amount",
  "total",
  "payable",
  "paid",
  "outstanding",
  "balance",
  "due",
  "gross",
  "net",
  "tax",
  "discount",
  "advance",
  "revenue",
  "collected",
];

function isMoneyKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (COUNT_HINTS.some((hint) => lower.includes(hint))) return false;
  return MONEY_HINTS.some((hint) => lower.includes(hint));
}

/** The top-level `currency` field, if the payload carries one (e.g. `"USD"`). */
export function summaryCurrency(summary: BillingSummary): string | null {
  const value = summary.currency ?? summary.currency_code;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function summaryStats(summary: BillingSummary): SummaryStat[] {
  const stats: SummaryStat[] = [];

  for (const [key, value] of Object.entries(summary)) {
    if (key === "currency" || key === "currency_code") continue;
    if (!isNumeric(value)) continue;

    stats.push({ key, label: titleCase(key), value, isMoney: isMoneyKey(key) });
  }

  return stats;
}

/** First non-blank string field present, among a few plausible key names. */
function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** First numeric field present, among a few plausible key names. */
function firstNumeric(record: Record<string, unknown>, keys: string[]): string | number | null {
  for (const key of keys) {
    const value = record[key];
    if (isNumeric(value)) return value;
  }
  return null;
}

function toBreakdownRow(raw: unknown): SummaryBreakdownRow | null {
  if (!isRecord(raw)) return null;

  const label = firstString(raw, ["label", "status", "status_label", "name", "title", "key"]);
  if (!label) return null;

  return {
    label,
    count: firstNumeric(raw, ["count", "total", "invoices", "qty", "quantity"]),
    amount: firstNumeric(raw, ["amount", "total_amount", "sum", "payable", "outstanding"]),
  };
}

export function summaryBreakdowns(summary: BillingSummary): SummaryBreakdown[] {
  const breakdowns: SummaryBreakdown[] = [];

  for (const [key, value] of Object.entries(summary)) {
    if (!Array.isArray(value) || value.length === 0) continue;

    const rows = value.map(toBreakdownRow).filter((row): row is SummaryBreakdownRow => row !== null);
    if (rows.length === 0) continue;

    breakdowns.push({ key, label: titleCase(key), rows });
  }

  return breakdowns;
}
