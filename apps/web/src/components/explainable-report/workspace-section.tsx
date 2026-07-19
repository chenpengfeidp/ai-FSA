import type { ReactElement, ReactNode } from "react";

export function WorkspaceSection({
  children,
  id,
}: Readonly<{
  children: ReactNode;
  id: string;
}>): ReactElement {
  return (
    <div className="scroll-mt-28 space-y-4" id={id}>
      {children}
    </div>
  );
}
