import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-body font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-caption",
        lg: "h-11 px-5",
        icon: "size-10",
      },
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover",
        outline:
          "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
        ghost: "bg-transparent text-foreground hover:bg-surface-muted",
        danger: "bg-error text-primary-foreground shadow-sm hover:bg-error/90",
        /* Legacy aliases used by existing screens */
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

export function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps): ReactElement {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}

export { buttonVariants };
export type { ButtonProps };
