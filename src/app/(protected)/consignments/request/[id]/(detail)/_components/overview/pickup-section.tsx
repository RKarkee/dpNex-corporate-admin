"use client";

import type { ConsignmentRequestDetail } from "../../../../types";
import { Field, Section, yesNo } from "../detail-primitives";

/** Collection and delivery arrangements, and whether the shipper wants updates. */
export function PickupSection({
  request,
}: {
  request: ConsignmentRequestDetail;
}) {
  return (
    <Section title="Pickup and delivery">
      <Field label="Pickup required" value={yesNo(request.need_pickup)} />
      <Field label="Pickup time" value={request.pickup_time} />
      <Field label="Preferred delivery" value={request.preferred_delivery_time} />
      <Field label="Status updates" value={yesNo(request.send_updates)} />
      {/* Notes are free text and wrap, so they get a wider cell than the rest. */}
      <Field
        label="Pickup note"
        value={request.pickup_note}
        className="sm:col-span-2"
      />
      <Field
        label="Delivery note"
        value={request.delivery_note}
        className="sm:col-span-2"
      />
    </Section>
  );
}
