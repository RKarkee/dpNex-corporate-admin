"use client";

import * as React from "react";
import { Loader2, Lock, MessageSquare, Send } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { useMounted } from "@/shared/hooks/use-mounted";
import { formatDateTime } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";

import { useReplyToTicket } from "../../_hooks/use-reply-to-ticket";
import {
  customerVisibleCount,
  isInternalReply,
  relativeAge,
  replyAuthor,
  replyBody,
  threadReplies,
} from "../../lib/ticket-replies";
import {
  acceptsReplies,
  type SupportTicket,
  type SupportTicketReply,
} from "../../types";

/** The API's own limit for a reply. */
const MESSAGE_MAX = 5000;

/**
 * The conversation on a ticket, and the box for adding to it.
 *
 * Internal notes and customer replies are the same list on the wire and must
 * not look the same on screen: anyone scanning the thread has to be able to
 * tell, at a glance and without reading, what the customer has already been
 * told. So a note gets an amber rail, a tinted card and a Lock badge, while a
 * reply stays plain — the same treatment the admin console gives them.
 *
 * The server owns the distinction: `is_internal` is honoured only for internal
 * callers, so a customer cannot post a staff-only note and staff cannot leak
 * one by mistake. Which is why nothing here is filtered and nothing is
 * optimistic — the thread refetches after every send and renders the audience
 * the server actually gave each message.
 */
export function TicketThread({ ticket }: { ticket: SupportTicket }) {
  const replies = threadReplies(ticket.replies);
  const visibleToCustomer = customerVisibleCount(replies);
  const canReply = acceptsReplies(ticket);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare aria-hidden className="size-4" />
          Conversation
          {replies.length > 0 ? (
            <>
              <Badge variant="secondary">{replies.length}</Badge>
              <span className="text-xs font-normal text-muted-foreground">
                {visibleToCustomer} visible to the customer
              </span>
            </>
          ) : null}
        </h2>

        {replies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No replies yet. The first one you send sets the response time on this
            ticket.
          </p>
        ) : (
          <ol className="space-y-3">
            {replies.map((reply, index) => (
              <ReplyItem key={reply.id ?? index} reply={reply} />
            ))}
          </ol>
        )}

        {canReply ? (
          <ReplyComposer ticketId={ticket.id} />
        ) : (
          <p className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
            This ticket is closed, so it takes no more replies. Raise a new one
            if the problem comes back.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReplyItem({ reply }: { reply: SupportTicketReply }) {
  /*
   * "3h ago" depends on the current time, so it is rendered only after mount —
   * the server and the browser would compute different strings and React would
   * throw the subtree away. The absolute timestamp is there either way.
   */
  const mounted = useMounted();
  const age = mounted ? relativeAge(reply.created_at) : "";
  const internal = isInternalReply(reply);

  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        internal
          ? "border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/70"
          : "border-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {replyAuthor(reply)}
        </span>

        {/* Read off what came back, not off what was asked for — so a note the
            server decided to publish says so, right after it is posted. */}
        {internal ? (
          <Badge className="border-transparent bg-amber-100 text-amber-800">
            <Lock aria-hidden className="size-3" />
            Internal note
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Sent to customer
          </Badge>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {formatDateTime(reply.created_at)}
          {age ? ` · ${age}` : ""}
        </span>
      </div>

      {/* The line breaks someone typed carry meaning. */}
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
        {replyBody(reply) || "—"}
      </p>
    </li>
  );
}

/**
 * Reply composer.
 *
 * The design problem here is not validation — a reply is one string — it is
 * that `is_internal` decides who can read the text, and there is no edit or
 * delete endpoint to undo a mistake. The realistic failure is someone typing
 * context meant for colleagues into what turns out to be a public reply.
 *
 * So the mode is not a checkbox tucked under the box. It is a two-button switch
 * above it, it restyles the whole composer, the placeholder changes, and the
 * submit button says which kind it will post. At no point does the screen look
 * the same in both modes. After every send it returns to public: the dangerous
 * direction is believing you are internal when you are public, so the composer
 * never silently keeps the safer-looking mode from a previous action.
 */
function ReplyComposer({ ticketId }: { ticketId: number | string }) {
  const [message, setMessage] = React.useState("");
  const [isInternal, setIsInternal] = React.useState(false);
  const reply = useReplyToTicket(ticketId);

  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && !reply.isPending;

  const send = async () => {
    if (!canSend) return;

    try {
      await reply.mutateAsync({ message: trimmed, isInternal });
      setMessage("");
      setIsInternal(false);
    } catch {
      // Toasted by the hook. The text stays exactly where it is — retyping a
      // paragraph because a request timed out is the worst outcome here.
    }
  };

  /** Ctrl/Cmd+Enter sends, the convention for a box inside a page. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4 transition-colors",
        isInternal ? "border-amber-300 bg-amber-50/60" : "border-border bg-card",
      )}
    >
      {/* Two buttons rather than a toggle: a toggle has an off-state that has
          to be read, these each say what they are. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => setIsInternal(false)}
            aria-pressed={!isInternal}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              isInternal
                ? "text-muted-foreground hover:text-foreground"
                : "bg-card text-foreground shadow-sm",
            )}
          >
            Reply to customer
          </button>
          <button
            type="button"
            onClick={() => setIsInternal(true)}
            aria-pressed={isInternal}
            className={cn(
              "flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              isInternal
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Lock aria-hidden className="size-3" />
            Internal note
          </button>
        </div>

        <p
          className={cn(
            "text-xs",
            isInternal ? "font-medium text-amber-700" : "text-muted-foreground",
          )}
        >
          {isInternal
            ? "Staff only — the customer will not see this."
            : "The customer will see this."}
        </p>
      </div>

      <Textarea
        rows={3}
        value={message}
        maxLength={MESSAGE_MAX}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isInternal
            ? "Context for whoever picks this up next…"
            : "Add to this ticket…"
        }
        aria-label={isInternal ? "Write an internal note" : "Write a reply"}
        disabled={reply.isPending}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {/* The counter only appears once it could plausibly matter. */}
          {message.length > MESSAGE_MAX - 500
            ? `${message.length} / ${MESSAGE_MAX}`
            : "A posted reply cannot be edited or deleted. Ctrl+Enter sends."}
        </p>

        <Button
          type="button"
          size="sm"
          onClick={() => void send()}
          disabled={!canSend}
          className={cn(
            isInternal && "bg-amber-500 text-white hover:bg-amber-600",
          )}
        >
          {reply.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isInternal ? (
            <Lock className="size-4" />
          ) : (
            <Send className="size-4" />
          )}
          {isInternal ? "Add internal note" : "Send reply"}
        </Button>
      </div>
    </div>
  );
}
