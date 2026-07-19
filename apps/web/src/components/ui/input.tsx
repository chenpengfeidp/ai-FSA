import type { InputHTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type, ...props }: InputProps): ReactElement {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-border-strong bg-surface px-3.5 text-body text-foreground shadow-sm outline-none transition-colors placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary-muted disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
