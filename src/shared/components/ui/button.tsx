import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover active:scale-[0.99]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        outline:
          "border border-border bg-card text-foreground shadow-soft hover:bg-accent hover:text-accent-foreground",
        // The brand pair. Their `focus-visible:ring-*` overrides the base
        // `ring-ring/40` — cva concatenates base-then-variant into one class
        // string and `cn()` runs twMerge over it, so the variant wins.
        // `orange` carries navy text and hovers *lighter*: white on orange is
        // 3.42:1, and darkening the fill drops the navy pair below AA too.
        crimson:
          "bg-brand-crimson text-brand-crimson-foreground shadow-soft hover:bg-brand-crimson-hover active:scale-[0.99] focus-visible:ring-brand-crimson/40",
        "crimson-outline":
          "border border-brand-crimson/30 bg-card text-brand-crimson shadow-soft hover:border-brand-crimson/60 hover:bg-brand-crimson-surface active:scale-[0.99] focus-visible:ring-brand-crimson/40",
        orange:
          "bg-brand-orange text-brand-orange-foreground shadow-soft hover:bg-brand-orange-hover active:scale-[0.99] focus-visible:ring-brand-orange/50",
        "orange-outline":
          "border border-brand-orange/40 bg-card text-brand-orange-ink shadow-soft hover:border-brand-orange/70 hover:bg-brand-orange-surface active:scale-[0.99] focus-visible:ring-brand-orange/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:text-brand-crimson hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-6 text-[0.9375rem]",
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
