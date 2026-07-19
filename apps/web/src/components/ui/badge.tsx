import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-surface-muted text-muted-foreground",
        pass: "bg-success-muted text-success-foreground",
        fail: "bg-error-muted text-error-foreground",
        info: "bg-info-muted text-info-foreground",
        warning: "bg-warning-muted text-warning-foreground",
        success: "bg-success-muted text-success-foreground",
        error: "bg-error-muted text-error-foreground",
        PASS: "bg-success-muted text-success-foreground",
        FAIL: "bg-error-muted text-error-foreground",
        INFO: "bg-info-muted text-info-foreground",
        WARNING: "bg-warning-muted text-warning-foreground",
        SUCCESS: "bg-success-muted text-success-foreground",
        ERROR: "bg-error-muted text-error-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): ReactElement {
  return <span className={cn(badgeVariants({ className, variant }))} {...props} />;
}

export { badgeVariants };
export type { BadgeProps };
