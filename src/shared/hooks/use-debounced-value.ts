"use client";

import * as React from "react";

/**
 * The value, but only after it has stopped changing for `delay` ms.
 *
 * For inputs that drive a request. Typing "KTM-2401" would otherwise fire
 * eight searches and race their responses; this fires one.
 *
 * `useDeferredValue` is not a substitute — that yields to rendering priority,
 * which does nothing for a value whose cost is a network round trip.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
