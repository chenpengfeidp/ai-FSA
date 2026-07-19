import { Inbox } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Card, CardContent } from "./card";

export function EmptyState({
  action,
  description,
  icon,
  title,
}: Readonly<{
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}>): ReactElement {
  return (
    <Card className="hover:translate-y-0 hover:shadow-card">
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
          {icon ?? <Inbox aria-hidden="true" className="size-5" />}
        </span>
        <p className="mt-4 text-title text-foreground">{title}</p>
        <p className="mt-2 max-w-md text-body text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-6">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
