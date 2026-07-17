import type { InputHTMLAttributes, ReactElement } from "react";
import { cn } from "../../lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type, ...props }: InputProps): ReactElement {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
