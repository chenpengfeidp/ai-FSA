import { LoaderCircle } from "lucide-react";
import type { ReactElement } from "react";
import { cn } from "../lib/utils";

export function LoadingSpinner({
  className,
  label = "Analyzing match",
}: Readonly<{ className?: string; label?: string }>): ReactElement {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} role="status">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      <span>{label}</span>
    </span>
  );
}
