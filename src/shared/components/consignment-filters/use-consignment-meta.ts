"use client";

import { useQuery } from "@tanstack/react-query";

import { metaQuery } from "@/shared/api/services/meta.service";

/**
 * The shared `/meta` controls, for the consignment list filters. Neutral so
 * both the request and admin lists read statuses/urgency/product type the same
 * way: `controls.<name>.values` is `{ key, label }[]`.
 */
export function useConsignmentMeta(): Record<string, any> {
  const { data } = useQuery(metaQuery);
  return (data?.controls ?? {}) as Record<string, any>;
}
