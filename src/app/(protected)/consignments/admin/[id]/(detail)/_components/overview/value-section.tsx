"use client";

import type { ConsignmentDetail } from "../../../../types";
import { Field, Section, yesNo } from "../detail-primitives";

/** What customs will read: declared value, HS code, goods description. */
export function ValueSection({
  consignment,
}: {
  consignment: ConsignmentDetail;
}) {
  const declared = `${consignment.declared_value ?? ""} ${
    consignment.declared_currency ?? ""
  }`.trim();

  return (
    <Section title="Declared value">
      <Field label="Declared value" value={declared} />
      <Field label="HS code known" value={yesNo(consignment.have_hscode)} />
      <Field label="HS code" value={consignment.consignment_hs_code} />
      <Field
        label="Goods description"
        value={consignment.consignment_goods_desc}
      />
    </Section>
  );
}
