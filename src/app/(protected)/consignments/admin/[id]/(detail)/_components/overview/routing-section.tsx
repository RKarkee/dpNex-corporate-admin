"use client";

import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";

import type { ConsignmentDetail } from "../../../../types";
import { Field, Section, related } from "../detail-primitives";

/**
 * How the consignment moves: carrier, lane, service, packaging.
 *
 * Each routing field prefers the expanded resource's readable name and falls
 * back to the raw code — `DHL Express` when the API joined it, `DHL` when it
 * did not. Nobody should have to memorise agent codes to read this page.
 */
export function RoutingSection({
  consignment,
  boxCount,
}: {
  consignment: ConsignmentDetail;
  /** From the boxes the detail response carried, when it omits `no_of_boxes`. */
  boxCount: number;
}) {
  const { productTypeOptions } = useMetaOptions();

  return (
    <Section title="Routing">
      <Field
        label="Agent"
        value={related(consignment.agent, "agent_name") ?? consignment.agent_code}
      />
      <Field
        label="Via"
        value={related(consignment.via, "via_desc") ?? consignment.via_code}
      />
      <Field
        label="Integrator"
        value={
          related(consignment.integrator, "integrator_desc") ??
          consignment.integrator_code
        }
      />
      <Field
        label="Service"
        value={related(consignment.service, "value") ?? consignment.service_code}
      />
      <Field
        label="Package type"
        value={related(consignment.package, "value") ?? consignment.package_type}
      />
      <Field
        label="Product type"
        value={optionLabel(productTypeOptions, consignment.product_type)}
      />
      <Field label="Nature of goods" value={consignment.nature_of_goods} />
      <Field label="Boxes" value={consignment.no_of_boxes ?? boxCount} />
    </Section>
  );
}
