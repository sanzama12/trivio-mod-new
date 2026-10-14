import Link from "next/link";
import type { ReactNode } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { cn } from "@/lib/cn";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <LuChevronRight className="size-3.5 text-slate-400" aria-hidden />}
            {it.href ? (
              <Link href={it.href} className="hover:text-primary-700">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-slate-700">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  const cls = "flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(cls, "border-slate-200 bg-white text-slate-700 hover:border-primary-300")} aria-label="Trang trước">
          <LuChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(cls, "border-slate-100 bg-slate-50 text-slate-300")} aria-hidden>
          <LuChevronLeft className="size-4" />
        </span>
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-slate-500">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(cls, p === page ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-primary-300")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(cls, "border-slate-200 bg-white text-slate-700 hover:border-primary-300")} aria-label="Trang sau">
          <LuChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(cls, "border-slate-100 bg-slate-50 text-slate-300")} aria-hidden>
          <LuChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
  headingAs: Heading = "h3",
}: {
  icon: ReactNode;
  title: string;
  /** Cấp tiêu đề — dùng "h1" khi trạng thái rỗng là nội dung chính của trang. */
  headingAs?: "h1" | "h2" | "h3";
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div aria-hidden className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary-50 text-primary-600 [&>svg]:size-7">{icon}</div>
      <Heading className="text-lg font-bold text-slate-900">{title}</Heading>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

export function StatTile({ label, value, tone = "slate" }: { label: string; value: ReactNode; tone?: "slate" | "primary" }) {
  return (
    <div className={cn("rounded-xl px-4 py-3", tone === "primary" ? "bg-primary-50" : "bg-slate-50")}>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", tone === "primary" ? "text-primary-700" : "text-slate-900")}>{value}</p>
    </div>
  );
}
