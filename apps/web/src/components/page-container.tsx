import type { ReactElement, ReactNode } from "react";
import { AppTopNav } from "./app-top-nav";

export function PageContainer({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <div className="min-h-screen bg-background">
      <AppTopNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
        {children}
      </main>
    </div>
  );
}
