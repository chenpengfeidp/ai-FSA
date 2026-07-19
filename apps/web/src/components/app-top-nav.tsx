"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { todaysMatches } from "../lib/todays-matches";
import { cn } from "../lib/utils";

const workspaceHref =
  todaysMatches[0] !== undefined
    ? `/matches/${encodeURIComponent(todaysMatches[0].id)}`
    : "/";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    match: (path: string) => path === "/",
  },
  {
    href: "/#todays-matches",
    label: "Match Center",
    match: () => false,
  },
  {
    href: workspaceHref,
    label: "Workspace",
    match: (path: string) => path.startsWith("/matches/"),
  },
  {
    href: "/reports",
    label: "Reports",
    match: (path: string) => path.startsWith("/reports"),
  },
] as const;

export function AppTopNav({
  eyebrow,
}: Readonly<{ eyebrow?: string }>): ReactElement {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link className="group inline-flex items-center gap-3" href="/">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-secondary text-caption font-bold text-secondary-foreground shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
          >
            FAS
          </span>
          <div>
            <p className="text-body font-semibold tracking-tight text-foreground">
              AI Football Analysis
            </p>
            {eyebrow ? (
              <p className="text-caption text-muted-foreground">{eyebrow}</p>
            ) : null}
          </div>
        </Link>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);

            return (
              <Link
                className={cn(
                  "rounded-md px-3 py-1.5 text-caption font-semibold transition-colors duration-200",
                  active
                    ? "bg-primary-muted text-info-foreground"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
