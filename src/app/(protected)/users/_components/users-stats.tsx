"use client";

import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { StatCard, type StatTone } from "../../_components/stat-card";
import { useUserStats } from "../_hooks/use-user-stats";

/** Cycled across the role cards so a long list stays readable. */
const ROLE_TONES: StatTone[] = ["crimson", "orange", "navy"];

/** How many role cards render before the rest fold into an "Other roles" tile. */
const MAX_ROLE_CARDS = 3;

/**
 * Headline counts above the table: everyone, then a card per role.
 *
 * Renders nothing on failure. These numbers are context for the table below,
 * which shows its own error — a second error card for a decorative row would
 * be noise, and an empty space says "unavailable" well enough.
 */
export function UsersStats() {
  const { data, isPending, isError } = useUserStats();

  if (isError) return null;

  if (isPending) {
    return (
      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-9 w-14" />
            <Skeleton className="mt-3 h-4 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  const shown = data.roles.slice(0, MAX_ROLE_CARDS);
  const rest = data.roles.slice(MAX_ROLE_CARDS);
  const restTotal = rest.reduce((sum, role) => sum + role.count, 0);

  // A user with two roles is counted under both, so the role cards can add up
  // to more than `total`. Saying so beats letting the numbers look broken.
  const roleHint = data.complete
    ? "Users holding this role"
    : `Counted across the first ${data.total} users`;

  return (
    <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total users"
        value={data.total}
        hint={`${data.active} active in this corporate`}
      />

      {shown.map((role, index) => (
        <StatCard
          key={role.id}
          label={role.label}
          value={role.count}
          hint={roleHint}
          tone={ROLE_TONES[index % ROLE_TONES.length]}
        />
      ))}

      {rest.length > 0 ? (
        <StatCard
          label="Other roles"
          value={restTotal}
          hint={`Across ${rest.length} more roles`}
          tone="navy"
        />
      ) : null}
    </div>
  );
}
