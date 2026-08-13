"use client";

import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";

import {
  StatusBadge,
  UrgencyBadge,
} from "../../../../_components/status-badges";
import type { ConsignmentRequestDetail } from "../../../../types";
import { Field, Section } from "../detail-primitives";

/**
 * Where this request stands. Status and urgency are badges rather than plain
 * fields — they are the two values someone scans for first.
 */
export function StatusSection({ request }: { request: ConsignmentRequestDetail }) {
  const { urgencyOptions } = useMetaOptions();

  return (
    <Section title="Status">
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Status
        </p>
        <StatusBadge status={request.status} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Urgency
        </p>
        {/* Stored as a code (`URGENT`); `/meta` carries the word to show. */}
        <UrgencyBadge
          urgency={optionLabel(urgencyOptions, request.urgency) || request.urgency}
        />
      </div>

      <Field label="Ship date" value={request.ship_date} />
      <Field label="Reference" value={request.shipper_reference_code} />
    </Section>
  );
}
