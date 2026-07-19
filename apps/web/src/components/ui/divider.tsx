import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  readonly orientation?: "horizontal" | "vertical";
}

export function Divider({
  className,
  orientation = "horizontal",
  ...props
}: DividerProps): ReactElement {
  if (orientation === "vertical") {
    return (
      <hr
        aria-orientation="vertical"
        className={cn("mx-2 h-auto w-px self-stretch border-0 bg-border", className)}
        {...props}
      />
    );
  }

  return (
    <hr
      aria-orientation="horizontal"
      className={cn("my-4 h-px w-full border-0 bg-border", className)}
      {...props}
    />
  );
}

export type { DividerProps };
