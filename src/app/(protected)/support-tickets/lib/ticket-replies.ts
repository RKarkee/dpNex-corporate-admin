import type { SupportTicketReply } from "../types";

/**
 * Reading the conversation on a ticket.
 *
 * `is_internal` splits one list into two audiences: a staff-only note and a
 * message the customer sees. They arrive in the same array and must never look
 * the same on screen — see `ticket-thread.tsx`.
 *
 * The server decides which a message actually is: the flag is honoured only for
 * internal callers, so a customer cannot post a staff-only note and staff
 * cannot leak one by mistake. That is also why the thread renders what came
 * back rather than what was requested — after a refetch, a note shows the
 * audience the server gave it.
 */

/** Staff-only, whatever shape the flag arrives in. */
export function isInternalReply(reply: SupportTicketReply): boolean {
  return reply.is_internal === true;
}

/**
 * The thread, in the order the API sent it.
 *
 * Oldest first in the observed payload, which is the right way round for a
 * conversation, so it is deliberately not re-sorted — a client-side sort on a
 * nullable `created_at` would shuffle exactly the rows it cannot order.
 *
 * Nothing is filtered here: the API returns what this caller is allowed to see,
 * and hiding a note it chose to send would leave someone unable to read a note
 * they had just written.
 */
export function threadReplies(
  replies?: SupportTicketReply[] | null,
): SupportTicketReply[] {
  return Array.isArray(replies) ? replies : [];
}

/** How many of them the customer can actually see. */
export function customerVisibleCount(replies: SupportTicketReply[]): number {
  return replies.filter((reply) => !isInternalReply(reply)).length;
}

/** What was written. */
export function replyBody(reply: SupportTicketReply): string {
  return String(reply.message ?? "").trim();
}

/**
 * Who wrote it.
 *
 * `author_name` arrives null even when `user_id` is set, so the id is the
 * fallback. "Support" is used for a reply carrying neither — an author-less
 * message on this side of the conversation is the support team's.
 */
export function replyAuthor(reply: SupportTicketReply): string {
  const named = String(reply.author_name ?? "").trim();
  if (named) return named;
  if (reply.user_id) return `User #${reply.user_id}`;
  return "Support";
}

/**
 * "3h ago", for a timestamp.
 *
 * Depends on the current time, so it must only ever render after mount — the
 * server and the browser would compute different strings and React would throw
 * the subtree away. Callers gate this behind `useMounted`.
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
