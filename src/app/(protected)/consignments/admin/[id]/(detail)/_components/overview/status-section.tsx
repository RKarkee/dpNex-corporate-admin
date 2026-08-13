"use client";

import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";

import { StatusBadge, UrgencyBadge } from "../../../../_components/status-badges";
import type { ConsignmentDetail } from "../../../../types";
import { Field, Section } from "../detail-primitives";

/**
 * Where this consignment stands. Status and urgency are badges rather than
 * plain fields — they are the two values someone scans for first.
 */
export function StatusSection({
  consignment,
}: {
  consignment: ConsignmentDetail;
}) {
  const { urgencyOptions } = useMetaOptions();

  return (
    <Section title="Status">
      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Status
        </p>
        <StatusBadge status={consignment.status} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Urgency
        </p>
        {/* Stored as a code (`URGENT`); `/meta` carries the word to show. */}
        <UrgencyBadge
          urgency={
            optionLabel(urgencyOptions, consignment.urgency) || consignment.urgency
          }
        />
      </div>

      <Field label="Ship date" value={consignment.ship_date} />
      <Field label="Reference" value={consignment.shipper_reference_code} />
    </Section>
  );
}
