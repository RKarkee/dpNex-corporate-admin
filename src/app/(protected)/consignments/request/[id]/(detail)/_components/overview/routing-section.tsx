"use client";

import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";

import type { ConsignmentRequestDetail } from "../../../../types";
import { Field, Section, related } from "../detail-primitives";

/**
 * How the consignment moves: carrier, lane, service, packaging.
 *
 * Each routing field prefers the expanded resource's readable name and falls
 * back to the raw code — `DHL Express` when the API joined it, `DHL` when it
 * did not. Nobody should have to memorise agent codes to read this page.
 */
export function RoutingSection({
  request,
  boxCount,
}: {
  request: ConsignmentRequestDetail;
  /** From the boxes the detail response carried, when it omits `no_of_boxes`. */
  boxCount: number;
}) {
  const { productTypeOptions } = useMetaOptions();

  return (
    <Section title="Routing">
      <Field
        label="Agent"
        value={related(request.agent, "agent_name") ?? request.agent_code}
      />
      <Field
        label="Via"
        value={related(request.via, "via_desc") ?? request.via_code}
      />
      <Field
        label="Integrator"
        value={
          related(request.integrator, "integrator_desc") ?? request.integrator_code
        }
      />
      <Field
        label="Service"
        value={related(request.service, "value") ?? request.service_code}
      />
      <Field
        label="Package type"
        value={related(request.package, "value") ?? request.package_type}
      />
      <Field
        label="Product type"
        value={optionLabel(productTypeOptions, request.product_type)}
      />
      <Field label="Nature of goods" value={request.nature_of_goods} />
      <Field label="Boxes" value={request.no_of_boxes ?? boxCount} />
    </Section>
  );
}
