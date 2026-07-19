import { LibraryBig } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";

export function AnalysisLibraryEmpty({
  description,
  title,
}: Readonly<{
  description?: string;
  title?: string;
}>): ReactElement {
  return (
    <EmptyState
      action={
        <Button asChild size="lg" variant="primary">
          <Link href="/#todays-matches">Go to Match Center</Link>
        </Button>
      }
      description={
        description ??
        "Analyze a match from Match Center. Completed reports will land here so you can browse, favorite, and reopen them anytime."
      }
      icon={
        <span className="relative flex size-16 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary-muted"
          />
          <LibraryBig aria-hidden="true" className="relative size-7 text-primary" />
        </span>
      }
      title={title ?? "Run your first analysis"}
    />
  );
}
