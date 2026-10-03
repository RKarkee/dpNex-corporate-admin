import { formatAmount, parseDecimal } from "@/shared/lib/numbers";

/**
 * The account's credit terms, and the arithmetic every view of them shares.
 *
 * Two endpoints carry the same `credit` block — the profile record and
 * `GET /corporate/billing/credit` — so the type, the parser and the usage maths
 * live here once. The profile card and the header widget then cannot disagree
 * about what "available" or "nearly full" means.
 */

type YesNo = "Y" | "N";

/**
 * Amounts are parsed to numbers at the boundary. `null` means the API sent
 * nothing usable, kept apart from `0`: `available_credit` arrives as `null`
 * when the backend has not computed it, not when nothing is left.
 */
export interface CustomerCredit {
  credit_limit: number | null;
  used_limit: number | null;
  available_credit: number | null;
  /** The setting: whether the limit should be enforced for this account. */
  enforce_credit_limit: YesNo;
  /**
   * Whether it is enforced *right now*. Can be `false` while the setting is
   * `Y` — e.g. no limit has been set yet — so the two are kept separate.
   */
  is_enforced: boolean;
  credit_days: number | null;
  block_on_overdue: YesNo;
  /** Percent, e.g. `2.5` for 2.5%. */
  interest_rate: number | null;
  advance_balance: number | null;
  currency: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

const yesNo = (value: unknown): YesNo => (value === "Y" ? "Y" : "N");

/**
 * Parses a `credit` block.
 *
 * `fallback` is a record carrying flat copies (`credit_limit`,
 * `available_credit`, `default_currency`) — the customer record does — so an
 * older payload without the nested block still yields its limit. Returns
 * `null` only when neither source has anything to show.
 */
export function readCredit(
  block: unknown,
  fallback?: Record<string, unknown>,
): CustomerCredit | null {
  const source = isRecord(block) ? block : null;
  if (!source && fallback?.credit_limit === undefined) return null;

  const s = source ?? {};
  const f = fallback ?? {};

  return {
    credit_limit: parseDecimal(s.credit_limit ?? f.credit_limit),
    used_limit: parseDecimal(s.used_limit),
    available_credit: parseDecimal(s.available_credit ?? f.available_credit),
    enforce_credit_limit: yesNo(s.enforce_credit_limit),
    is_enforced: s.is_enforced === true,
    credit_days: parseDecimal(s.credit_days),
    block_on_overdue: yesNo(s.block_on_overdue),
    interest_rate: parseDecimal(s.interest_rate),
    advance_balance: parseDecimal(s.advance_balance),
    currency: optionalStr(s.default_currency) ?? optionalStr(f.default_currency),
  };
}

export type CreditTone = "normal" | "warning" | "danger";

export interface CreditUsage {
  limit: number;
  used: number;
  /** `null` when the API sent none and there is no limit to derive it from. */
  available: number | null;
  hasLimit: boolean;
  /** 0–100, capped; `0` when there is no limit. */
  usedPercent: number;
  tone: CreditTone;
}

/**
 * The derived figures every credit view shows.
 *
 * Available is taken as the API reports it. Only when that is `null` *and* a
 * positive limit exists is it derived as `limit − used`; with no limit,
 * deriving would produce a meaningless negative.
 *
 * Amber from 75% used, red from 90% or once available goes negative.
 */
export function creditUsage(credit: CustomerCredit): CreditUsage {
  const limit = credit.credit_limit ?? 0;
  const used = credit.used_limit ?? 0;
  const hasLimit = limit > 0;

  const available = credit.available_credit ?? (hasLimit ? limit - used : null);
  const usedPercent = hasLimit ? Math.min((used / limit) * 100, 100) : 0;

  const tone: CreditTone =
    (available !== null && available < 0) || usedPercent >= 90
      ? "danger"
      : usedPercent >= 75
        ? "warning"
        : "normal";

  return { limit, used, available, hasLimit, usedPercent, tone };
}

/** `USD 3,750`, or `—` for a missing value. */
export function formatMoney(value: number | null, currency?: string | null): string {
  if (value === null) return "—";
  return `${currency ?? ""} ${formatAmount(value)}`.trim();
}

/** Tailwind fill colour for a usage bar or dot, by tone. */
export const CREDIT_TONE_FILL: Record<CreditTone, string> = {
  normal: "bg-primary",
  warning: "bg-amber-500",
  danger: "bg-destructive",
};
