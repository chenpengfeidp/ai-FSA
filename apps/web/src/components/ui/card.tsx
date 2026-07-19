import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-0 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
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
        "flex flex-col gap-2 border-b border-border px-6 py-5",
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
  return <h2 className={cn("text-title text-foreground", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): ReactElement {
  return (
    <p className={cn("text-body text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}
