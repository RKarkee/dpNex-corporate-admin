"use client";

import { useCallback, useEffect, useRef } from "react";

import { toast } from "@/shared/components/toast";
import {
  checkRestrictedItem,
  type RestrictedItemParams,
} from "@/shared/api/services/restricted-item.service";

/**
 * Debounced restricted-item check for consignment item fields.
 *
 * Returns a `check` function to call on every item-name or HS-code change. It
 * waits out rapid edits, hits the API, and pops a toast when the API flags the
 * value as restricted. Fire-and-forget: it never blocks the field or the form,
 * and a result a newer edit has superseded is dropped.
 */
export function useRestrictedItemCheck(delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (params: RestrictedItemParams) => {
      const hasValue = !!params.item_name?.trim() || !!params.hs_code?.trim();
      if (!hasValue) return;
      if (timer.current) clearTimeout(timer.current);
      const ticket = ++seq.current;
      timer.current = setTimeout(async () => {
        const result = await checkRestrictedItem(params);
        if (ticket !== seq.current) return;
        if (result.restricted) {
          toast.error(result.message || "This item is restricted.");
        }
      }, delay);
    },
    [delay],
  );
}
