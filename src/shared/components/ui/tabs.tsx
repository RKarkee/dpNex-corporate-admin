"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/shared/lib/utils";

/**
 * Panel-switching tabs.
 *
 * Distinct from `scroll-tabs.tsx`, which is a filter bar — plain buttons in a
 * `radiogroup` that narrow a list staying on screen. These swap panels, so the
 * roving focus and `aria-controls` wiring a real tablist implies is honest
 * here, and Radix supplies it.
 */

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // Scrolls rather than wraps: two long labels plus a count badge
        // overflow a 375px viewport, and a wrapped tablist reads as two rows
        // of unrelated buttons.
        //
        // `w-max` rather than `w-full`: the track hugs its tabs instead of
        // stretching edge to edge, which is what makes the active tab read as a
        // segmented control rather than a full-width banner.
        "inline-flex w-max items-center justify-start gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4",
        // `data-[state=inactive]:` is load-bearing — a bare `hover:` would
        // paint the crimson tint over the navy active tab below.
        "text-muted-foreground data-[state=inactive]:hover:bg-brand-crimson-surface data-[state=inactive]:hover:text-brand-crimson",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50",
        // Brand navy, the same token the sidebar's active item uses
        // (`--sidebar-primary` and `--primary` are the same value), so a
        // selected tab and a selected nav item read as the same state.
        // Weight shifts too, so the selection survives a colour-blind read.
        "data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-primary-foreground data-[state=active]:shadow-soft",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
