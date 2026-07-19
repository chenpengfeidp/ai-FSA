import { Inbox } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Card, CardContent } from "./ui/card";

export function EmptyState({
  action,
  description,
  title,
}: Readonly<{
  action?: ReactNode;
  description: string;
  title: string;
}>): ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Inbox aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-4 font-semibold text-slate-900">{title}</p>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
        {action ? <div className="mt-6">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
