import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-caption font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-muted text-foreground",
        primary: "border-primary/20 bg-primary-muted text-info-foreground",
        muted: "border-transparent bg-surface-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface TagProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

export function Tag({ className, variant, ...props }: TagProps): ReactElement {
  return <span className={cn(tagVariants({ className, variant }))} {...props} />;
}

export { tagVariants };
export type { TagProps };
