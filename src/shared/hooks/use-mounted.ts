"use client";

import * as React from "react";

const noopSubscribe = () => () => {};

/**
 * True only after the first client render — guards hydration-sensitive UI.
 * Implemented with `useSyncExternalStore` so it never calls setState in an effect.
 */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
