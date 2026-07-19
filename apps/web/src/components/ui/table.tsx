import type {
  HTMLAttributes,
  ReactElement,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "../../lib/utils";

export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>): ReactElement {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom text-body", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement {
  return (
    <thead
      className={cn("border-b border-border bg-surface-muted", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  );
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>): ReactElement {
  return (
    <tr
      className={cn(
        "border-b border-border align-top transition-colors hover:bg-surface-muted/70",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>): ReactElement {
  return (
    <th
      className={cn(
        "h-11 px-4 text-left text-caption font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>): ReactElement {
  return (
    <td
      className={cn("px-4 py-4 text-body text-foreground", className)}
      {...props}
    />
  );
}
