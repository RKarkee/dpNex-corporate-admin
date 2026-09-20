import { privateApiClient } from "@/shared/api/private-client";

import type { AttentionSummary } from "../types";

/**
 * `/corporate/attention-summary` — what is still open, as counts.
 *
 * A different question from the notification list: a notification is read once
 * and gone, an attention count stays until the underlying work is done.
 *
 * The payload is read as a plain map of groups to metrics rather than a typed
 * shape, because the API adds both as modules arrive and anything this file
 * does not know about should still reach the screen.
 */
export async function fetchAttentionSummary(
  signal?: AbortSignal,
): Promise<AttentionSummary> {
  const raw = await privateApiClient.get<unknown>("/corporate/attention-summary", {
    silent: true,
    // Polled — it must never be the thing that signs someone out.
    skipAuthRedirect: true,
    signal,
  });

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  if (!isRecord(raw)) return {};

  const data = isRecord(raw.data) ? raw.data : raw;
  if (isRecord(data.attentionsummary)) return data.attentionsummary as AttentionSummary;
  if (isRecord(data.attention_summary)) return data.attention_summary as AttentionSummary;

  return data as AttentionSummary;
}
