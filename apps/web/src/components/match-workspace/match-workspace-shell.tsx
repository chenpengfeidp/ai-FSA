import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { MatchWorkspaceSidebar } from "./match-workspace-sidebar";

export function MatchWorkspaceShell({
  activeMatchId,
  children,
}: Readonly<{
  activeMatchId?: string | undefined;
  children: ReactNode;
}>): ReactElement {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
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
              <p className="text-caption text-muted-foreground">Workspace</p>
            </div>
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[90rem] gap-0 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="hidden border-r border-border/80 lg:block">
          <div className="sticky top-[3.25rem] max-h-[calc(100vh-3.25rem)] overflow-y-auto px-4 py-6">
            <MatchWorkspaceSidebar activeMatchId={activeMatchId} />
          </div>
        </div>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 lg:hidden">
            <MatchWorkspaceSidebar activeMatchId={activeMatchId} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
