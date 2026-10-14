import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "primary" | "accent" | "success" | "danger" | "slate" | "pink" | "teal" | "violet" | "solid";

const tones: Record<BadgeTone, string> = {
  primary: "bg-primary-50 text-primary-700 ring-primary-200",
  accent: "bg-accent-50 text-accent-700 ring-accent-200",
  success: "bg-success-50 text-success-700 ring-success-100",
  danger: "bg-danger-50 text-danger-700 ring-danger-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  solid: "bg-primary-600 text-white ring-primary-600",
};

export function Badge({
  tone = "primary",
  children,
  className,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", tones[tone], className)}
    >
      {children}
    </span>
  );
}
