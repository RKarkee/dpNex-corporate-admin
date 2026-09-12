"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import {
  ApprovalStatusBadge,
  ApprovalTypeBadge,
} from "../../_components/approval-badges";
import {
  formatAmount,
  formatDateTime,
  formatDiscount,
  payloadKeys,
} from "../../lib/approval-format";
import { infoFieldLabel, type ApprovalRequest } from "../../types";

/**
 * One approval request, in full.
 *
 * Three blocks in the order a reader needs them: what is being asked for, why,
 * and what has happened to it since. The payload comes first because it is the
 * only part that differs between the four types, and it is what a reviewer —
 * or the person checking on their own request — actually opened this page for.
 */

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-48 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * The proposed change, rendered by type.
 *
 * The update types fall through to a plain key/value list of whatever the
 * payload carries — the server whitelists what it applies and can add keys, so
 * rendering only the attributes this app knows about would quietly hide part of
 * a request from the person who raised it.
 */
function PayloadDetail({ request }: { request: ApprovalRequest }) {
  const payload = request.payload ?? {};
  const type = String(request.type).toUpperCase();

  if (type === "CREDIT_LIMIT_INCREASE") {
    return (
      <dl>
        <Row label="Proposed credit limit">
          <span className="text-base font-semibold">
            {formatAmount(payload.credit_limit)}
          </span>
        </Row>
      </dl>
    );
  }

  if (type === "DISCOUNT") {
    return (
      <dl>
        <Row label="Discount">
          <span className="text-base font-semibold">
            {formatDiscount(payload)}
          </span>
        </Row>
        <Row label="Applies to">
          {request.subject_type ? `${request.subject_type} ` : ""}
          {request.subject_id ? `#${request.subject_id}` : "—"}
        </Row>
      </dl>
    );
  }

  const keys = payloadKeys(payload);
  if (keys.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing proposed.</p>;
  }

  return (
    <dl>
      {keys.map((key) => (
        <Row key={key} label={infoFieldLabel(key)}>
          {String(payload[key] ?? "—")}
        </Row>
      ))}
    </dl>
  );
}

export function ApprovalDetail({ request }: { request: ApprovalRequest }) {
  const decided = Boolean(request.reviewed_at || request.review_remarks);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <span className="text-base font-semibold text-foreground">
            {request.request_no || `#${request.id}`}
          </span>
          <ApprovalTypeBadge request={request} />
          <ApprovalStatusBadge request={request} />
        </CardContent>
      </Card>

      <Section title="What is being asked for">
        <PayloadDetail request={request} />
      </Section>

      <Section title="Reason">
        {/* `whitespace-pre-line`: the reason is authored in a textarea, so the
            line breaks are part of what was written. */}
        <p className="whitespace-pre-line text-sm text-foreground">
          {request.reason?.trim() || (
            <span className="text-muted-foreground">
              No reason was given.
            </span>
          )}
        </p>
      </Section>

      <Section title="Progress">
        <dl>
          <Row label="Requested by">
            {request.requested_by_name?.trim() || "—"}
          </Row>
          <Row label="Requested at">
            {formatDateTime(request.requested_at ?? request.created_at)}
          </Row>
          <Row label="Reviewed by">
            {request.reviewed_by_name?.trim() || (
              <span className="text-muted-foreground">Not yet reviewed</span>
            )}
          </Row>
          <Row label="Reviewed at">{formatDateTime(request.reviewed_at)}</Row>
          {/* Approval and application are separate moments — a request can be
              agreed to and only written to the record afterwards, and "why has
              my limit not changed yet" is answered here. */}
          <Row label="Applied at">
            {request.applied_at ? (
              formatDateTime(request.applied_at)
            ) : (
              <span className="text-muted-foreground">
                Not applied to your record yet
              </span>
            )}
          </Row>
          {decided ? (
            <Row label="Reviewer remarks">
              <span className="whitespace-pre-line">
                {request.review_remarks?.trim() || "—"}
              </span>
            </Row>
          ) : null}
        </dl>
      </Section>
    </div>
  );
}

/** The same rhythm with the values blanked, so the page does not jump. */
export function ApprovalDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </CardContent>
      </Card>

      {Array.from({ length: 3 }).map((_, section) => (
        <Card key={section}>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 3 }).map((__, row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
