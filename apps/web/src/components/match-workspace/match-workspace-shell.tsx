import type { ReactElement, ReactNode } from "react";
import { AppTopNav } from "../app-top-nav";
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
      <AppTopNav eyebrow="Workspace" />

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
