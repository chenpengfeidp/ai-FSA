import { LibraryBig } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
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
          <Link href="/#todays-matches">{zh.library.goToMatchCenter}</Link>
        </Button>
      }
      description={description ?? zh.library.empty.default.description}
      icon={
        <span className="relative flex size-16 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary-muted"
          />
          <LibraryBig aria-hidden="true" className="relative size-7 text-primary" />
        </span>
      }
      title={title ?? zh.library.empty.default.title}
    />
  );
}
