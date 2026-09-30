"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type { RemoteAddressCheckStatus } from "@/shared/components/ui/remote-address-banner";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { checkRemoteAddress } from "../services/consignment-admin.service";
import type { CheckRemoteAddressPayload, RemoteAddressCheckResult } from "../types";
import { consignmentAdminKeys } from "./query-keys";

/**
 * Is the receiver's address remote? Asked of
 * `POST /corporate/consignments/check-remote-address` whenever the receiver's
 * country, state, city or zip (or the routing) changes.
 *
 * All six inputs are debounced together (600 ms) and only sent once every one
 * is filled in. A `useQuery` keyed on those six values, so an unchanged
 * combination is never asked twice.
 */

export interface CheckRemoteAddressParams {
  country?: string | null;
  state?: string | null;
  city?: string | null;
  zip?: string | null;
  viaCode?: string | null;
  integratorCode?: string | null;
  /** Gate the whole check off — e.g. a dialog that is closed. */
  enabled?: boolean;
}

export interface UseCheckRemoteAddressResult {
  status: RemoteAddressCheckStatus;
  result: RemoteAddressCheckResult | null;
  errorMessage: string | null;
}

type Inputs = Omit<CheckRemoteAddressPayload, "address_type">;

export function useCheckRemoteAddress({
  country,
  state,
  city,
  zip,
  viaCode,
  integratorCode,
  enabled = true,
}: CheckRemoteAddressParams): UseCheckRemoteAddressResult {
  const composite = JSON.stringify({
    receiver_country: (country ?? "").trim(),
    receiver_state: (state ?? "").trim(),
    receiver_city: (city ?? "").trim(),
    receiver_zip: (zip ?? "").trim(),
    via_code: (viaCode ?? "").trim(),
    integrator_code: (integratorCode ?? "").trim(),
  } satisfies Inputs);
  const debounced = useDebouncedValue(composite, 600);
  const inputs = React.useMemo(() => JSON.parse(debounced) as Inputs, [debounced]);
  const ready = Object.values(inputs).every(Boolean);

  const query = useQuery({
    queryKey: consignmentAdminKeys.remoteAddressCheck({ ...inputs }),
    queryFn: ({ signal }) =>
      checkRemoteAddress({ ...inputs, address_type: "receiver" }, signal),
    enabled: enabled && ready,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const status: RemoteAddressCheckStatus =
    !enabled || !ready
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
        : "Failed to check remote address"
      : null,
  };
}
