import * as React from "react";

import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {/* Steps down on small screens — a 3xl heading eats a third of a
            phone viewport before any content shows. `break-words` catches a
            long role label with no space to wrap at. */}
        <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {/* `shrink-0` stops a long title squeezing the buttons; the actions
          stretch full-width on a phone, where side-by-side is cramped. */}
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
