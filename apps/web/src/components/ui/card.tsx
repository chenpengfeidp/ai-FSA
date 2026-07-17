import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-slate-100 px-6 py-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): ReactElement {
  return (
    <h2
      className={cn("text-base font-semibold text-slate-950", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): ReactElement {
  return (
    <p className={cn("text-sm leading-6 text-slate-500", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}
