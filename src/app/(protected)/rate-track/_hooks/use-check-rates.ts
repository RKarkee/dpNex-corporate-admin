"use client";

import { useMutation } from "@tanstack/react-query";

import { checkRates } from "../services/rate-track.service";
import type { CheckRatesInput } from "../types";

/**
 * Fetches quotes for a destination and weight.
 *
 * A mutation rather than a query even though it only reads: it runs on
 * submit, and checking the same inputs twice must ask again — a query would
 * serve the cached answer and look as though nothing happened. No `onError`:
 * the panel shows the failure in place.
 */
export function useCheckRates() {
  return useMutation({
    mutationFn: (input: CheckRatesInput) => checkRates(input),
  });
}
