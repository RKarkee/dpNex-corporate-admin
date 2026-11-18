"use client";

import { useMutation } from "@tanstack/react-query";

import { trackShipment } from "../services/rate-track.service";
import type { TrackInput } from "../types";

/**
 * Looks a shipment up by its tracking number. A mutation for the same reason
 * as `useCheckRates`: a shipment moves, and a cached answer is exactly the
 * wrong thing to hand back.
 */
export function useTrackShipment() {
  return useMutation({
    mutationFn: (input: TrackInput) => trackShipment(input),
  });
}
