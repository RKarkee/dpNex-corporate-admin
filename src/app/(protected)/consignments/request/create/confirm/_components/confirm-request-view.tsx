"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PackageSearch } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

import { ConsignmentForm } from "../../../_components/consignment-form";
import { RateSummaryCard } from "../../../_components/rate-cards";
import { useCreateConsignmentRequest } from "../../../_hooks/use-save-consignment-request";
import {
  newBoxDefaults,
  receiverDefaults,
  senderDefaults,
  type ConsignmentFormValues,
} from "../../../schema";
import type { RateOption } from "../../../types";

/**
 * Step two of creating a request: the full consignment, against a chosen rate.
 *
 * Everything this page needs arrives in the query string, put there by the
 * rate-check step. That is what makes the step refreshable and
 * back-navigable — the alternative, holding the quote in memory between two
 * routes, loses it on reload and strands the user mid-flow.
 *
 * The receiver's address is pre-filled from what was priced. Those four fields
 * are what the quote was calculated for, so leaving them blank would invite
 * the user to enter a destination the price does not apply to.
 */

/** The quote, or `null` if the parameter is missing or was tampered with. */
function parseRate(raw: string | null): RateOption | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    // A hand-edited URL should land on "start over", not crash the form when
    // the payload builder reaches for `agent_code`.
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "agent_code" in parsed &&
      "service_code" in parsed
    ) {
      return parsed as RateOption;
    }
    return null;
  } catch {
    return null;
  }
}

/** Today, as the `yyyy-mm-dd` a date input expects. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ConfirmRequestView() {
  const params = useSearchParams();
  const createRequest = useCreateConsignmentRequest();

  const rate = React.useMemo(() => parseRate(params.get("rate")), [params]);
  const packageType = params.get("package_type") ?? "";
  const packageTypeLabel = params.get("package_type_label") ?? "";

  const defaultValues = React.useMemo<ConsignmentFormValues>(
    () => ({
      urgency: "",
      sender: { ...senderDefaults },
      receiver: {
        ...receiverDefaults,
        country: params.get("receiver_country") ?? "",
        state: params.get("receiver_state") ?? "",
        state_name: params.get("receiver_state_name") ?? "",
        city: params.get("receiver_city") ?? "",
        zip: params.get("receiver_zip") ?? "",
      },
      boxes: [{ ...newBoxDefaults }],

      ship_date: today(),
      need_pickup: "N",
      pickup_time: "",
      preferred_delivery_time: "",
      pickup_note: "",
      delivery_note: "",

      product_type: "",
      product_type_label: "",

      have_hscode: "N",
      consignment_hs_code: "",
      consignment_hs_code_label: "",

      consignment_goods_desc: "",
      declared_value: 0,
      declared_currency: newBoxDefaults.declared_currency,
      declared_currency_label: newBoxDefaults.declared_currency,

      nature_of_goods: "",
      shipper_reference_code: "",

      send_updates: "Y",
    }),
    [params],
  );

  // Reached by a direct link, a stale bookmark, or a back-navigation after the
  // request was already created.
  if (!rate) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary">
          <PackageSearch className="size-6" strokeWidth={2} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          No rate selected
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          A consignment request is created against a specific rate. Check rates
          for the destination and pick one to continue.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/consignments/request/create">Check rates</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RateSummaryCard
        rate={rate}
        packageType={packageType}
        packageTypeLabel={packageTypeLabel}
      />

      <ConsignmentForm
        defaultValues={defaultValues}
        onSubmit={(values) =>
          createRequest.mutate({ rate, packageType, values })
        }
        submitting={createRequest.isPending}
        submitLabel="Create request"
        submittingLabel="Creating…"
        cancelHref="/consignments/request"
        error={createRequest.error}
      />
    </div>
  );
}
