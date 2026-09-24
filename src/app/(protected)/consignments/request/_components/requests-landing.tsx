"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import { DeletedRequestsView } from "./deleted-requests-view";
import { RequestsView } from "./requests-view";

/**
 * The landing page's two tabs — the live list and the deleted one.
 *
 * The open tab lives in `?tab=`, so a refresh or a shared link reopens it; the
 * main list keeps the bare URL. Anything unrecognised falls back to it.
 */

const DELETED = "deleted";

export function RequestsLanding() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") === DELETED ? DELETED : "all";

  function handleTabChange(next: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (next === DELETED) query.set("tab", DELETED);
    else query.delete("tab");
    const qs = query.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="all">Consignment Requests</TabsTrigger>
        <TabsTrigger value={DELETED}>Deleted Consignment Requests</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <RequestsView />
      </TabsContent>
      <TabsContent value={DELETED}>
        <DeletedRequestsView />
      </TabsContent>
    </Tabs>
  );
}
