"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import {
  dismissToast,
  holdToast,
  resumeToast,
  useToasts,
  type Toast,
  type ToastVariant,
} from "./toast-store";

/**
 * Top-right toast stack. Mounted once, in `AppProviders`.
 *
 * Rendered through a portal into `document.body` so no ancestor's `overflow`
 * or stacking context can clip it — a toast fired from inside a dialog has to
 * land above the dialog.
 */

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: React.ElementType; text: string; surface: string; bar: string }
> = {
  success: {
    icon: CheckCircle2,
    text: "text-success",
    surface: "bg-success-surface border-success-border",
    bar: "bg-success",
  },
  error: {
    icon: XCircle,
    text: "text-destructive",
    surface: "bg-danger-surface border-danger-border",
    bar: "bg-destructive",
  },
  warning: {
    icon: AlertTriangle,
    text: "text-warning",
    surface: "bg-warning-surface border-warning-border",
    bar: "bg-warning",
  },
  info: {
    icon: Info,
    text: "text-info",
    surface: "bg-info-surface border-info-border",
    bar: "bg-info",
  },
};

function ToastCard({ toast }: { toast: Toast }) {
  const style = VARIANT_STYLES[toast.variant];
  const Icon = style.icon;

  return (
    <div
      // `alert` interrupts a screen reader for failures; `status` waits its turn.
      role={toast.variant === "error" ? "alert" : "status"}
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      onMouseEnter={() => holdToast(toast.id)}
      onMouseLeave={() => resumeToast(toast.id)}
      onFocus={() => holdToast(toast.id)}
      onBlur={() => resumeToast(toast.id)}
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-xl border shadow-card",
        "backdrop-blur-sm transition-all duration-200 ease-out",
        style.surface,
        toast.leaving
          ? "translate-x-4 scale-95 opacity-0"
          : "animate-toast-in translate-x-0 scale-100 opacity-100",
      )}
    >
      <div className="flex items-start gap-3 p-3.5 pr-9">
        <Icon className={cn("mt-px size-[18px] shrink-0", style.text)} aria-hidden />

        <div className="min-w-0 flex-1">
          {toast.title ? (
            <p className={cn("text-sm font-semibold", style.text)}>{toast.title}</p>
          ) : null}
          <p
            className={cn(
              "break-words text-sm leading-snug",
              style.text,
              toast.title && "mt-0.5 opacity-90",
            )}
          >
            {toast.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className={cn(
          "absolute right-2 top-2 rounded-md p-1 opacity-50 transition-opacity",
          "hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/40",
          style.text,
        )}
      >
        <X className="size-3.5" />
      </button>

      {toast.duration > 0 ? (
        <div
          aria-hidden
          className={cn("absolute bottom-0 left-0 h-0.5 w-full origin-left", style.bar)}
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
            // Pauses with the dismiss timer, so hover freezes both.
            animationPlayState: toast.leaving ? "paused" : "running",
          }}
        />
      ) : null}
    </div>
  );
}

/** Never resubscribes — the value is constant per environment. */
const noopSubscribe = () => () => {};

export function Toaster() {
  const toasts = useToasts();

  // `document` does not exist during SSR, so the portal can only mount after
  // hydration. `useSyncExternalStore` gives the server `false` and the client
  // `true` in one pass, without the extra render an effect-plus-setState costs.
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return createPortal(
    <div
      // `pointer-events-none` on the column, `auto` on each card — the empty
      // space between toasts must not swallow clicks on the page behind.
      className={cn(
        "pointer-events-none fixed inset-0 z-[100] flex flex-col items-end gap-2 p-4",
        "sm:p-6",
      )}
    >
      <div className="flex w-full max-w-[380px] flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
    </div>,
    document.body,
  );
}
