"use client";

import * as React from "react";

import { can } from "@/shared/auth/permissions";
import { useOptionalSession } from "@/shared/auth/session-context";

import { RATE_TRACK_PERMISSIONS } from "../permissions";

/** Which of the two tabs this user may use. */
export function useRateTrackPermissions() {
  const user = useOptionalSession();

  return React.useMemo(
    () => ({
      canCheckRates: can(user, RATE_TRACK_PERMISSIONS.rates),
      canTrack: can(user, RATE_TRACK_PERMISSIONS.track),
    }),
    [user],
  );
}
