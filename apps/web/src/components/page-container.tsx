import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

export function PageContainer({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <Link className="group inline-flex items-center gap-3" href="/">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-secondary text-caption font-bold text-secondary-foreground shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
            >
              FAS
            </span>
            <span className="text-body font-semibold tracking-tight text-foreground">
              AI Football Analysis
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
        {children}
      </main>
    </div>
  );
}
