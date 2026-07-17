import { CircleAlert } from "lucide-react";
import type { ReactElement } from "react";

export function ErrorPanel({
  message,
}: Readonly<{ message: string }>): ReactElement {
  return (
    <div
      className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-800"
      role="alert"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">Analysis could not be completed</p>
        <p className="mt-1 text-sm leading-6 text-red-700">{message}</p>
      </div>
    </div>
  );
}
