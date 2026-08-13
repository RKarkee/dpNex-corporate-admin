"use client";

import type { ConsignmentDetail } from "../../../../types";
import { Field, Section, yesNo } from "../detail-primitives";

/** Collection and delivery arrangements, and whether the shipper wants updates. */
export function PickupSection({
  consignment,
}: {
  consignment: ConsignmentDetail;
}) {
  return (
    <Section title="Pickup and delivery">
      <Field label="Pickup required" value={yesNo(consignment.need_pickup)} />
      <Field label="Pickup time" value={consignment.pickup_time} />
      <Field
        label="Preferred delivery"
        value={consignment.preferred_delivery_time}
      />
      <Field label="Status updates" value={yesNo(consignment.send_updates)} />
      {/* Notes are free text and wrap, so they get a wider cell than the rest. */}
      <Field
        label="Pickup note"
        value={consignment.pickup_note}
        className="sm:col-span-2"
      />
      <Field
        label="Delivery note"
        value={consignment.delivery_note}
        className="sm:col-span-2"
      />
    </Section>
  );
}
