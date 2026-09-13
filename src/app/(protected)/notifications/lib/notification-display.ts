import { humanize, type AttentionSummary } from "../types";

/**
 * Turning payloads into something readable, without a vocabulary of our own.
 *
 * Every label here is either the server's (from `/meta`) or derived from the
 * key it was given. Nothing enumerates types, channels or attention metrics:
 * the API grows all three, and a hardcoded list would quietly drop whatever it
 * has not been taught.
 */

/** `19` → `"19"`, `120` → `"9+"` — a badge is a signal, not a number. */
export function badgeText(count: number, max = 9): string {
  if (!Number.isFinite(count) || count <= 0) return "";
  return count > max ? `${max}+` : String(count);
}

/**
 * The short label for a notification type.
 *
 * `/meta`'s own labels are written for a settings screen — "Operational alert
 * to affected shipments (delay, disruption)" — and do not fit a table cell, so
 * a badge gets the humanised key and the full label goes in the tooltip and the
 * filter dropdown.
 */
export function typeBadgeLabel(type?: string | null): string {
  const key = String(type ?? "").trim();
  return key ? humanize(key) : "";
}

/* -------------------------------------------------------------------------- */
/* Attention summary                                                          */
/* -------------------------------------------------------------------------- */

export interface AttentionRow {
  /** `assignments.pending` — group and metric, joined. */
  key: string;
  label: string;
  count: number;
  /** Where the count can be acted on, when this portal has such a screen. */
  href?: string;
  /** A metric that is a subset of another in the same group, e.g. unseen ⊂ pending. */
  isSubset?: boolean;
}

/**
 * The screens a count can be acted on.
 *
 * Keyed by `group.metric`, and deliberately partial: a metric with no entry
 * still renders, with its number, just without a link. That is the honest
 * answer for a count whose screen this portal does not have yet — and it means
 * a new metric from the API appears immediately rather than waiting for a
 * release here.
 */
const ATTENTION_ROUTES: Record<string, string> = {
  "support_tickets.awaiting_first_reply":
    "/support-tickets?awaiting_first_response=true",
  "support_tickets.open": "/support-tickets?open=Y",
  "support_tickets.unassigned": "/support-tickets?unassigned=Y",
  "approval_requests.pending": "/approval-requests?status=PENDING",
  "pickup_requests.pending": "/pickup-requests",
  "consignment_requests.pending": "/consignments/request",
};

/** Metrics that count a slice of another metric in the same group. */
const SUBSET_METRICS = new Set(["unseen", "new"]);

/**
 * The summary object, flattened into rows the menu can render.
 *
 * `notifications.*` is dropped: the bell already owns unread, and two controls
 * showing the same number is how a badge stops meaning anything.
 *
 * Rows are sorted by count so the thing most in need of attention is first,
 * and zeroes are kept — "nothing pending" is worth seeing, greyed out, rather
 * than leaving someone to wonder whether the row failed to load.
 */
export function attentionRows(summary?: AttentionSummary | null): AttentionRow[] {
  if (!summary || typeof summary !== "object") return [];

  const rows: AttentionRow[] = [];

  for (const [group, metrics] of Object.entries(summary)) {
    if (group === "notifications") continue;
    if (!metrics || typeof metrics !== "object") continue;

    for (const [metric, value] of Object.entries(metrics)) {
      const count = Number(value);
      if (!Number.isFinite(count)) continue;

      const key = `${group}.${metric}`;
      rows.push({
        key,
        // "Support tickets awaiting first reply" — group then metric, both
        // humanised, so a name nobody has mapped still reads as English.
        label: `${humanize(group)} ${humanize(metric).toLowerCase()}`,
        count,
        href: ATTENTION_ROUTES[key],
        isSubset: SUBSET_METRICS.has(metric),
      });
    }
  }

  return rows.sort((a, b) => b.count - a.count);
}

/**
 * The number on the attention badge.
 *
 * Subset metrics are excluded — counting "unseen assignments" on top of
 * "pending assignments" would count the same work twice and inflate the badge.
 */
export function attentionTotal(summary?: AttentionSummary | null): number {
  return attentionRows(summary)
    .filter((row) => !row.isSubset)
    .reduce((total, row) => total + row.count, 0);
}

/* -------------------------------------------------------------------------- */
/* Grouping                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * "Today" / "Yesterday" / "Earlier", for a list of rows.
 *
 * Compared on the browser's own day boundaries, which is what a person means by
 * "today" — so this runs only after mount (see `useMounted` at the call site),
 * because the server would compute a different answer and React would throw the
 * subtree away.
 */
export function dayBucket(value?: string | null): "today" | "yesterday" | "earlier" {
  const iso = String(value ?? "").trim();
  if (!iso) return "earlier";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "earlier";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (date.getTime() >= startOfToday.getTime()) return "today";

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  return date.getTime() >= startOfYesterday.getTime() ? "yesterday" : "earlier";
}

export const BUCKET_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

/**
 * "13h ago".
 *
 * Depends on the current time, so it must only render after mount — the server
 * and the browser would disagree and React would discard the subtree.
 */
export function relativeAge(value?: string | null): string {
  const iso = String(value ?? "").trim();
  if (!iso) return "";

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";

  const seconds = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}
