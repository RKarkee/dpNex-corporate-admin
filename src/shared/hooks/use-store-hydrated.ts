"use client";

import * as React from "react";

/**
 * True once a `persist`-wrapped zustand store has read localStorage back.
 *
 * Every persisted store has the same trap: rehydration happens *after* the
 * first client render, so on that render the store still holds its defaults.
 * Anything that redirects, or lays out the page, from a persisted value has to
 * wait for this or it will act on the wrong state for one frame.
 *
 * `useSyncExternalStore` rather than an effect — it gives the server `false`
 * and the client the real value in a single pass, with no cascading render.
 */
export interface PersistedStore {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
}

export function useStoreHydrated(store: PersistedStore): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => store.persist.onFinishHydration(onChange),
    [store],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => store.persist.hasHydrated(),
    () => false,
  );
}
