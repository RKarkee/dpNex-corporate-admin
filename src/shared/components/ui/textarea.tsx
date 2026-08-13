import * as React from "react";

import { cn } from "@/shared/lib/utils";

/** Multi-line input. Same surface treatment as `Input`, free to grow taller. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-transparent bg-secondary px-3.5 py-2.5 text-sm text-foreground shadow-none transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring/40 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive/50 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
