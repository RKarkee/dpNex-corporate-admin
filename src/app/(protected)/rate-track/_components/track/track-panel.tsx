"use client";

import * as React from "react";
import { PackageSearch, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Card } from "@/shared/components/ui/card";

import { useTrackShipment } from "../../_hooks/use-track-shipment";
import { errorMessage } from "../../lib/errors";
import type { TrackInput } from "../../types";
import { TrackForm } from "./track-form";
import { TrackResultSkeleton, TrackResultView } from "./track-result";

/** The Track tab: a lookup bar over the shipment's full details. */
export function TrackPanel() {
  const track = useTrackShipment();
  const [searched, setSearched] = React.useState("");

  async function run(input: TrackInput) {
    setSearched(input.tracking_no);
    try {
      await track.mutateAsync(input);
    } catch {
      // Shown below.
    }
  }

  return (
    <div className="space-y-6">
      <TrackForm pending={track.isPending} onSubmit={(input) => void run(input)} />

      <div aria-live="polite">
        {track.isPending ? (
          <TrackResultSkeleton />
        ) : track.isError ? (
          <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Could not find “{searched}”
            </h2>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {errorMessage(track.error)}
            </p>
          </Card>
        ) : track.data ? (
          <TrackResultView result={track.data} />
        ) : (
          <EmptyState
            icon={PackageSearch}
            title="Track a shipment"
            description="Enter a tracking number to see where it is and where it has been."
          />
        )}
      </div>
    </div>
  );
}
