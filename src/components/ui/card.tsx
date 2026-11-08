import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-card", className)} {...rest} />;
}

export function CardHeader({ title, action, subtitle, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  align = "left",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", align === "center" && "flex-col items-center text-center")}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="mb-2 text-xs font-semibold tracking-wide text-primary-700">{eyebrow}</p>}
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-2 text-base leading-relaxed text-slate-600 max-w-prose">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
