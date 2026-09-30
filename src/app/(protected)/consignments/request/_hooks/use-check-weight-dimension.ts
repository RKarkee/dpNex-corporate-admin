"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type { WeightDimensionCheckStatus } from "@/shared/components/ui/weight-dimension-banner";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { calculateWeightDimension } from "../services/consignment-request.service";
import type { ShipmentRouting, WeightDimensionCheckResult } from "../types";
import { consignmentRequestKeys } from "./query-keys";

/**
 * One box's volumetric and chargeable ("valid") weight, from
 * `POST /corporate/consignments/calculate-weight-dimension`.
 *
 * What re-checks a box: ONLY its own box_no / weight / length / width / height.
 * The shipment context (routing + receiver address) is read through a ref at
 * fetch time and is deliberately NOT in the query key. That context is shared
 * by every box, so keying on it made one keystroke in the receiver zip re-fire
 * the check for every box at once — the request storm depNext-cms hit.
 *
 * Callers pass `enabled` only once the user has actually edited a dimension,
 * so opening a consignment for edit never sends one request per box.
 */

export interface CheckWeightDimensionParams {
  boxNo: number;
  routing: ShipmentRouting;
  receiver: { country?: string | null; state?: string | null; city?: string | null; zip?: string | null };
  weight: unknown;
  length: unknown;
  width: unknown;
  height: unknown;
  enabled?: boolean;
}

export interface UseCheckWeightDimensionResult {
  status: WeightDimensionCheckStatus;
  result: WeightDimensionCheckResult | null;
  errorMessage: string | null;
}

const num = (value: unknown) =>
  value === "" || value === null || value === undefined ? Number.NaN : Number(value);

export function useCheckWeightDimension({
  boxNo,
  routing,
  receiver,
  weight,
  length,
  width,
  height,
  enabled = true,
}: CheckWeightDimensionParams): UseCheckWeightDimensionResult {
  // Always the latest context — but never a reason to refetch on its own.
  const contextRef = React.useRef({ routing, receiver });
  React.useEffect(() => {
    contextRef.current = { routing, receiver };
  });

  const composite = JSON.stringify({
    box_no: String(boxNo),
    weight: String(num(weight)),
    length: String(num(length)),
    width: String(num(width)),
    height: String(num(height)),
  });
  const debounced = useDebouncedValue(composite, 800);
  const dims = React.useMemo(
    () => JSON.parse(debounced) as Record<"box_no" | "weight" | "length" | "width" | "height", string>,
    [debounced],
  );

  const contextReady = Boolean(
    routing.viaCode &&
      routing.integratorCode &&
      routing.packageType &&
      receiver.country &&
      receiver.state &&
      receiver.city &&
      receiver.zip,
  );
  const dimensionsReady =
    Number(dims.weight) > 0 &&
    Number(dims.length) > 0 &&
    Number(dims.width) > 0 &&
    Number(dims.height) > 0;

  const query = useQuery({
    queryKey: consignmentRequestKeys.weightDimensionCheck({ ...dims }),
    queryFn: async ({ signal }) => {
      const { routing: r, receiver: rc } = contextRef.current;
      const rows = await calculateWeightDimension(
        {
          box_no: Number(dims.box_no),
          via_code: r.viaCode,
          integrator_code: r.integratorCode,
          package_type: r.packageType,
          receiver_country: rc.country ?? "",
          receiver_state: rc.state ?? "",
          receiver_city: rc.city ?? "",
          receiver_zip: rc.zip ?? "",
          weight: Number(dims.weight),
          length: Number(dims.length),
          width: Number(dims.width),
          height: Number(dims.height),
        },
        signal,
      );
      return rows.find((row) => Number(row.box_no) === Number(dims.box_no)) ?? rows[0] ?? null;
    },
    enabled: enabled && contextReady && dimensionsReady,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const status: WeightDimensionCheckStatus =
    !enabled || !contextReady || !dimensionsReady
      ? "idle"
      : query.isFetching
        ? "checking"
        : query.isError
          ? "error"
          : query.data
            ? "success"
            : "idle";

  return {
    status,
    result: query.data ?? null,
    errorMessage: query.isError
      ? query.error instanceof Error && query.error.message
        ? query.error.message
        : "Failed to calculate weight/dimension"
      : null,
  };
}
