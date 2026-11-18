"use client";

import * as React from "react";
import { PackageSearch, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Card } from "@/shared/components/ui/card";

import { useCheckRates } from "../../_hooks/use-check-rates";
import { errorMessage } from "../../lib/errors";
import type { CheckRatesInput } from "../../types";
import { CheckRateForm } from "./check-rate-form";
import { RateResults, RateResultsSkeleton } from "./rate-results";

/**
 * The Check rate tab: the form on top, its answer below. The results are
 * scrolled into view once they arrive, since the form is tall.
 */
export function CheckRatePanel() {
  const check = useCheckRates();
  const [submitted, setSubmitted] = React.useState<CheckRatesInput | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  async function run(input: CheckRatesInput) {
    setSubmitted(input);
    try {
      await check.mutateAsync(input);
    } catch {
      // Shown below.
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset() {
    check.reset();
    setSubmitted(null);
  }

  return (
    <div className="space-y-6">
      <CheckRateForm pending={check.isPending} onSubmit={(input) => void run(input)} onReset={reset} />

      <div ref={resultsRef} className="min-w-0 scroll-mt-4" aria-live="polite">
        {check.isPending ? (
          <RateResultsSkeleton />
        ) : check.isError ? (
          <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold text-foreground">Could not check rates</h2>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {errorMessage(check.error)}
            </p>
          </Card>
        ) : check.data && submitted ? (
          <RateResults rates={check.data} input={submitted} />
        ) : (
          <EmptyState
            icon={PackageSearch}
            title="Get a shipping quote"
            description="Choose a destination and weight, and the available rates will appear here — cheapest first."
          />
        )}
      </div>
    </div>
  );
}
