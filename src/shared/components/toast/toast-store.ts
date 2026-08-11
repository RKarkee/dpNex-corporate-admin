import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

/**
 * Toast queue.
 *
 * A *vanilla* store, not `create()`, because `toast.success(…)` is called from
 * interceptors and service functions — plain modules with no React on the
 * stack. The hook below is the only React-aware part.
 */

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Optional bold line above the message. */
  title?: string;
  /** Milliseconds on screen. `0` pins it until dismissed. */
  duration: number;
  createdAt: number;
  /** Drives the exit animation; the row is removed once it finishes. */
  leaving: boolean;
}

export const TOAST_DEFAULT_DURATION = 3_000;

/** Older toasts past this are dropped, so a failing loop cannot bury the screen. */
const MAX_VISIBLE = 4;

/** Identical messages inside this window collapse into one. */
const DEDUPE_WINDOW_MS = 800;

/** Must outlast the CSS exit transition or the row snaps away mid-animation. */
const EXIT_ANIMATION_MS = 200;

interface ToastState {
  toasts: Toast[];
  add: (input: ToastInput) => string;
  /** Starts the exit animation; `remove` follows. */
  dismiss: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export interface ToastInput {
  variant?: ToastVariant;
  message: string;
  title?: string;
  duration?: number;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

export const toastStore = createStore<ToastState>()((set, get) => ({
  toasts: [],

  add: (input) => {
    const variant = input.variant ?? "info";
    const now = Date.now();

    // A double-click that fires the same mutation twice should not stack two
    // identical toasts.
    const duplicate = get().toasts.find(
      (t) =>
        !t.leaving &&
        t.message === input.message &&
        t.variant === variant &&
        now - t.createdAt < DEDUPE_WINDOW_MS,
    );
    if (duplicate) return duplicate.id;

    const id = `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = input.duration ?? TOAST_DEFAULT_DURATION;

    const toast: Toast = {
      id,
      variant,
      message: input.message,
      title: input.title,
      duration,
      createdAt: now,
      leaving: false,
    };

    set((state) => {
      const next = [...state.toasts, toast];

      // Over the cap, retire the oldest *live* toasts. Ones already animating
      // out are left alone so their exit finishes rather than snapping away.
      const live = next.filter((t) => !t.leaving);
      const overflow = live.length - MAX_VISIBLE;
      if (overflow <= 0) return { toasts: next };

      const evicted = new Set(live.slice(0, overflow).map((t) => t.id));

      for (const id of evicted) {
        clearTimer(id);
        timers.set(id, setTimeout(() => get().remove(id), EXIT_ANIMATION_MS));
      }

      return {
        toasts: next.map((t) =>
          evicted.has(t.id) ? { ...t, leaving: true } : t,
        ),
      };
    });

    if (duration > 0) {
      timers.set(id, setTimeout(() => get().dismiss(id), duration));
    }

    return id;
  },

  dismiss: (id) => {
    clearTimer(id);
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    }));
    timers.set(id, setTimeout(() => get().remove(id), EXIT_ANIMATION_MS));
  },

  remove: (id) => {
    clearTimer(id);
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clear: () => {
    for (const id of timers.keys()) clearTimer(id);
    set({ toasts: [] });
  },
}));

/** Subscribes a component to the queue. */
export function useToasts(): Toast[] {
  return useStore(toastStore, (state) => state.toasts);
}

export function dismissToast(id: string): void {
  toastStore.getState().dismiss(id);
}

/** Pause-on-hover: cancel the pending timer, then restart it on leave. */
export function holdToast(id: string): void {
  clearTimer(id);
}

export function resumeToast(id: string): void {
  const toast = toastStore.getState().toasts.find((t) => t.id === id);
  if (!toast || toast.leaving || toast.duration <= 0) return;

  timers.set(
    id,
    setTimeout(() => toastStore.getState().dismiss(id), toast.duration),
  );
}
