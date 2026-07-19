import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";

export interface BreadcrumbItem {
  readonly href?: string;
  readonly label: string;
}

export function Breadcrumb({
  items,
}: Readonly<{ items: readonly BreadcrumbItem[] }>): ReactElement {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="inline-flex items-center gap-1.5" key={item.label}>
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 text-slate-400"
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  className="font-medium text-slate-600 hover:text-blue-700"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast
                      ? "font-semibold text-slate-950"
                      : "font-medium text-slate-600"
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
