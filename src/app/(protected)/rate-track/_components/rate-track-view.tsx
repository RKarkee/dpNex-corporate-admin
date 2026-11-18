"use client";

import { useRateTrackPermissions } from "../_hooks/use-rate-track-permissions";
import { CheckRatePanel } from "./check-rate/check-rate-panel";
import { RateTrackTabs, useRateTrackTab, type RateTrackTab } from "./rate-track-tabs";
import { TrackPanel } from "./track/track-panel";

/**
 * Both panels stay mounted and only the inactive one is hidden, so a quote or
 * a tracking result is still there when the user switches back. A tab the
 * user has no grant for is neither shown nor mounted.
 */
export function RateTrackView() {
  const { canCheckRates, canTrack } = useRateTrackPermissions();

  const tabs: RateTrackTab[] = [
    ...(canCheckRates ? (["rates"] as const) : []),
    ...(canTrack ? (["track"] as const) : []),
  ];
  const active = useRateTrackTab(tabs);

  if (!active) return null;

  return (
    <>
      <RateTrackTabs tabs={tabs} active={active} />
      {canCheckRates ? (
        <div hidden={active !== "rates"}>
          <CheckRatePanel />
        </div>
      ) : null}
      {canTrack ? (
        <div hidden={active !== "track"}>
          <TrackPanel />
        </div>
      ) : null}
    </>
  );
}
