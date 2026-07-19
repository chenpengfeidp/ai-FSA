"use client";

import type { ReactElement } from "react";
import { cn } from "../../lib/utils";

export interface WorkspaceNavItem {
  readonly id: string;
  readonly label: string;
}

export function WorkspaceSectionNav({
  items,
}: Readonly<{ items: readonly WorkspaceNavItem[] }>): ReactElement {
  function scrollToSection(id: string): void {
    const target = document.getElementById(id);

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <nav
      aria-label="Workspace sections"
      className="sticky top-[3.25rem] z-10 -mx-1 overflow-x-auto border-b border-border/80 bg-background/90 px-1 py-3 backdrop-blur-md"
    >
      <ul className="flex min-w-max items-center gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              className={cn(
                "rounded-full border border-transparent bg-surface-muted px-3.5 py-1.5 text-caption font-semibold text-muted-foreground transition-colors duration-200",
                "hover:border-border hover:bg-surface hover:text-foreground",
              )}
              onClick={() => {
                scrollToSection(item.id);
              }}
              type="button"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
