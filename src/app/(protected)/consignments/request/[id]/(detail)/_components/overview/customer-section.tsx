"use client";

import { humanizeStatus } from "../../../../_components/status-badges";
import type { ConsignmentRequestDetail } from "../../../../types";
import { Field, Section, related } from "../detail-primitives";

/**
 * Who this request belongs to.
 *
 * Every field here reads off a related resource the API may or may not have
 * expanded, so all four fall back to "—" rather than assuming the join
 * happened.
 */
export function CustomerSection({
  request,
}: {
  request: ConsignmentRequestDetail;
}) {
  const customerType = related(request.customer, "customer_type");
  const corporateName = related(request.corporate, "name");
  const corporateCode = related(request.corporate, "corp_code");

  return (
    <Section title="Customer">
      <Field
        label="Customer"
        value={related(request.customer, "name") ?? related(request.user, "name")}
      />
      <Field
        label="Customer type"
        value={customerType ? humanizeStatus(customerType) : undefined}
      />
      <Field
        label="Corporate"
        value={
          corporateName
            ? corporateCode
              ? `${corporateName} (${corporateCode})`
              : corporateName
            : undefined
        }
      />
      <Field label="Assigned to" value={related(request.assigned_to, "name")} />
    </Section>
  );
}
