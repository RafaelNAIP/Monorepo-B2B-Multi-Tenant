import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)]",
        // Ticket Status
        open: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        in_progress:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        resolved:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        // Priority
        high: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        medium:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        low: "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
        // Subscription Status
        active:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
        inactive:
          "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
        trial:
          "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
