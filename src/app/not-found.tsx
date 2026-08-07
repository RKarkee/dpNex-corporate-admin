import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/site";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button asChild className="mt-6">
          <Link href={routes.dashboard}>Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
