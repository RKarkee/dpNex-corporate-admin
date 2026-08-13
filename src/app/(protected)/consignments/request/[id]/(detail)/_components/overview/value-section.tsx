"use client";

import type { ConsignmentRequestDetail } from "../../../../types";
import { Field, Section, yesNo } from "../detail-primitives";

/** What customs will read: declared value, HS code, goods description. */
export function ValueSection({
  request,
}: {
  request: ConsignmentRequestDetail;
}) {
  const declared = `${request.declared_value ?? ""} ${
    request.declared_currency ?? ""
  }`.trim();

  return (
    <Section title="Declared value">
      <Field label="Declared value" value={declared} />
      <Field label="HS code known" value={yesNo(request.have_hscode)} />
      <Field label="HS code" value={request.consignment_hs_code} />
      <Field label="Goods description" value={request.consignment_goods_desc} />
    </Section>
  );
}
