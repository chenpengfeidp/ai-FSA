"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Heart,
  Layers3,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import { cn } from "../../lib/utils";
import type { LibrarySidebarSection } from "../../types/analysis-library";

const SECTIONS: readonly {
  readonly id: LibrarySidebarSection;
  readonly label: string;
  readonly icon: typeof Sparkles;
}[] = [
  { id: "recent", label: zh.library.sections.recent, icon: Sparkles },
  { id: "favorites", label: zh.library.sections.favorites, icon: Heart },
  { id: "competitions", label: zh.library.sections.competitions, icon: Trophy },
  { id: "completed", label: zh.library.sections.completed, icon: CheckCircle2 },
  { id: "in-progress", label: zh.library.sections.inProgress, icon: Clock3 },
  { id: "failed", label: zh.library.sections.failed, icon: AlertCircle },
  { id: "settings", label: zh.library.sections.settings, icon: Settings },
];

export function AnalysisLibrarySidebar({
  activeSection,
  counts,
  onSelect,
}: Readonly<{
  activeSection: LibrarySidebarSection;
  counts: Readonly<Record<LibrarySidebarSection, number>>;
  onSelect: (section: LibrarySidebarSection) => void;
}>): ReactElement {
  return (
    <aside className="flex h-full flex-col gap-6">
      <div className="space-y-1 px-2">
        <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em] text-subtle">
          <Layers3 aria-hidden="true" className="size-3.5" />
          {zh.library.sidebarTitle}
        </p>
        <p className="text-body text-muted-foreground">{zh.library.sidebarHint}</p>
      </div>

      <nav aria-label={zh.library.sectionsAria}>
        <ul className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            const count = counts[section.id];
            const showCount = section.id !== "settings";

            return (
              <li key={section.id}>
                <button
                  aria-label={section.label}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,color,transform] duration-200",
                    active
                      ? "border-primary/30 bg-primary-muted text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-muted hover:text-foreground",
                  )}
                  onClick={() => {
                    onSelect(section.id);
                  }}
                  type="button"
                >
                  <span className="inline-flex items-center gap-2.5 text-body font-semibold">
                    <Icon aria-hidden="true" className="size-4" />
                    {section.label}
                  </span>
                  {showCount ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-caption font-medium",
                        active
                          ? "bg-surface text-info-foreground"
                          : "bg-surface-muted text-subtle",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
