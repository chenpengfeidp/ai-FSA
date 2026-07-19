import type { ReactElement } from "react";
import { cn } from "../../lib/utils";
import { Badge, type BadgeProps } from "./badge";

export type StatusBadgeStatus =
  | "PASS"
  | "FAIL"
  | "INFO"
  | "WARNING"
  | "SUCCESS"
  | "ERROR";

const statusDotClass: Record<StatusBadgeStatus, string> = {
  PASS: "bg-success",
  SUCCESS: "bg-success",
  FAIL: "bg-error",
  ERROR: "bg-error",
  INFO: "bg-info",
  WARNING: "bg-warning",
};

interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  readonly label?: string;
  readonly status: StatusBadgeStatus;
}

export function StatusBadge({
  className,
  label,
  status,
  ...props
}: StatusBadgeProps): ReactElement {
  return (
    <Badge
      className={cn("gap-1.5 normal-case", className)}
      variant={status}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", statusDotClass[status])}
      />
      {label ?? status}
    </Badge>
  );
}

export type { StatusBadgeProps };
