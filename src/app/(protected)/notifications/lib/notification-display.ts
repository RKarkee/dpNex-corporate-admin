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

const ATTENTION_ENDPOINT_PATHS: Record<string, string> = {
  supporttickets: "/support-tickets",
  pickuprequests: "/pickup-requests",
  consignmentrequests: "/consignments/request",
  "approval-requests": "/approval-requests",
};

/** Metrics that count a slice of another metric in the same group. */
const SUBSET_METRICS = new Set(["unseen", "new"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathLabel(parts: string[]): string {
  return parts.map((part) => humanize(part)).join(" ");
}

function appendParam(search: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null || value === "") return;

  if (Array.isArray(value)) {
    for (const item of value) appendParam(search, key, item);
    return;
  }

  search.append(key, String(value));
}

function endpointPath(endpoint: string | null | undefined): string | undefined {
  const key = String(endpoint ?? "").trim();
  if (!key) return undefined;
  return ATTENTION_ENDPOINT_PATHS[key];
}

function attentionHref(filter: unknown): string | undefined {
  if (!isRecord(filter)) return undefined;

  const path = endpointPath(filter.endpoint as string | null | undefined);
  if (!path) return undefined;

  const search = new URLSearchParams();
  const params = filter.params;
  if (isRecord(params)) {
    for (const [key, value] of Object.entries(params)) {
      appendParam(search, key, value);
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function leafFilterFor(
  filtersNode: unknown,
  metricParts: string[],
  key: string,
): unknown {
  if (!isRecord(filtersNode)) return undefined;

  const directKey = metricParts.length > 0 ? `${metricParts.join(".")}.${key}` : key;
  if (directKey in filtersNode) return filtersNode[directKey];

  if (key in filtersNode) return filtersNode[key];

  return undefined;
}

function nestedFilterFor(filtersNode: unknown, key: string): unknown {
  if (!isRecord(filtersNode)) return undefined;
  if (key in filtersNode) return filtersNode[key];
  return undefined;
}

function collectAttentionRows(
  node: unknown,
  group: string,
  metricParts: string[] = [],
  filtersNode: unknown,
): AttentionRow[] {
  if (!isRecord(node)) return [];

  const rows: AttentionRow[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (key === "filters") continue;

    const nextParts = [...metricParts, key];
    if (typeof value === "number") {
      rows.push({
        key: `${group}.${nextParts.join(".")}`,
        label: `${humanize(group)} ${pathLabel(nextParts).toLowerCase()}`,
        count: value,
        href: attentionHref(leafFilterFor(filtersNode, metricParts, key)),
        isSubset: SUBSET_METRICS.has(key),
      });
      continue;
    }

    if (isRecord(value)) {
      rows.push(
        ...collectAttentionRows(
          value,
          group,
          nextParts,
          nestedFilterFor(filtersNode, key),
        ),
      );
    }
  }

  return rows;
}

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
    rows.push(...collectAttentionRows(metrics, group, [], isRecord(metrics) ? metrics.filters : undefined));
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
