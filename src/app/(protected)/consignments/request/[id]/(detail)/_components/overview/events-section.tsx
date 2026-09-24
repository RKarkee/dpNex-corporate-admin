"use client";

import { History } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/dates";

import type { ConsignmentEventEntry } from "../../../../types";
import { personName } from "./person-name";

/**
 * The request's activity log — every event the API recorded (views, status
 * moves, events logged through Create Event), newest first.
 *
 * Read-only, and scrolls inside its own card past a fixed height: a busy
 * request collects dozens of VIEWED rows, which would otherwise push the rest
 * of the page out of reach.
 */
export function EventsSection({ events }: { events: ConsignmentEventEntry[] }) {
  const sorted = [...events].sort((a, b) =>
    String(b.performed_at ?? "").localeCompare(String(a.performed_at ?? "")),
  );

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3 text-base font-semibold text-foreground">
        <History className="size-4 text-primary" aria-hidden />
        Events ({events.length})
      </h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events recorded yet.</p>
      ) : (
        <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {sorted.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {event.event || event.event_code || "Event"}
                  </span>
                  {event.task_code ? <Badge variant="outline">{event.task_code}</Badge> : null}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  by {event.performed_by ? personName(event.performed_by) : "System"}
                </p>
                {event.remarks ? (
                  <p className="mt-0.5 break-words text-sm text-muted-foreground">
                    {event.remarks}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(event.performed_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
