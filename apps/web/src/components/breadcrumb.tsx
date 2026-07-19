import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { zh } from "../copy/zh";

export interface BreadcrumbItem {
  readonly href?: string;
  readonly label: string;
}

export function Breadcrumb({
  items,
}: Readonly<{ items: readonly BreadcrumbItem[] }>): ReactElement {
  return (
    <nav aria-label={zh.breadcrumb.aria}>
      <ol className="flex flex-wrap items-center gap-1.5 text-body text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="inline-flex items-center gap-1.5" key={item.label}>
              {index > 0 ? (
                <ChevronRight aria-hidden="true" className="size-3.5 text-subtle" />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  className="font-medium text-muted-foreground hover:text-primary"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground"
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
