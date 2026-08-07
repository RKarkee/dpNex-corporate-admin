import Link from "next/link";
import { Package } from "lucide-react";

import { routes, siteConfig } from "@/shared/config/site";
import { cn } from "@/shared/lib/utils";

interface BrandProps {
  /** Hide the wordmark (collapsed rail). */
  compact?: boolean;
  className?: string;
}

export function Brand({ compact = false, className }: BrandProps) {
  return (
    <Link
      href={routes.dashboard}
      className={cn(
        "flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        className,
      )}
      aria-label={`${siteConfig.name} home`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <Package className="size-[18px]" strokeWidth={2.2} />
      </span>
      {!compact ? (
        <span className="text-lg font-bold tracking-tight text-foreground">
          {siteConfig.name}
        </span>
      ) : null}
    </Link>
  );
}
