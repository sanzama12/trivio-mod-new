/** Thành phần giao diện dùng chung cho các trang quản trị (theo Figma A01–A09). */
import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AdminBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 space-y-6 px-4 py-6 sm:px-8 sm:py-8", className)} {...rest} />;
}

export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("relative rounded-2xl border border-slate-200 bg-white shadow-card", className)} {...rest} />;
}

const ICON_TONE = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-success-50 text-success-700",
  accent: "bg-accent-50 text-accent-700",
  danger: "bg-danger-50 text-danger-700",
} as const;

const VALUE_TONE = { primary: "text-primary-600", success: "text-slate-900", accent: "text-accent-700", danger: "text-danger-700", slate: "text-slate-900" } as const;

/** Thẻ số liệu: nhãn in hoa, biểu tượng góc phải, số lớn, dòng ghi chú. */
export function AdminStat({
  label,
  value,
  hint,
  hintTone = "slate",
  Icon,
  tone = "primary",
  valueTone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: "slate" | "success" | "danger" | "accent";
  Icon: ComponentType<{ className?: string }>;
  tone?: keyof typeof ICON_TONE;
  valueTone?: keyof typeof VALUE_TONE;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase sm:text-xs">{label}</p>
        <span className={cn("hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex", ICON_TONE[tone])} aria-hidden>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl", VALUE_TONE[valueTone])}>{value}</p>
      {hint && (
        <p className={cn("mt-1.5 text-xs sm:text-[13px]", hintTone === "success" ? "text-success-700" : hintTone === "danger" ? "text-danger-700" : hintTone === "accent" ? "text-accent-700" : "text-slate-500")}>{hint}</p>
      )}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>;
}

export const th = "px-4 py-3 text-left text-[13px] font-semibold whitespace-nowrap text-slate-500";
export const td = "px-4 py-3 align-middle text-sm text-slate-700";
export const selectCls =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none";
export const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none";

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }) : "—";

export function ago(iso: string | null | undefined, nowMs: number = Date.now()) {
  if (!iso) return "Chưa đăng nhập";
  const m = Math.round((nowMs - Date.parse(iso)) / 60000);
  if (m < 2) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d === 1) return "Hôm qua";
  if (d < 7) return `${d} ngày trước`;
  if (d < 30) return `${Math.round(d / 7)} tuần trước`;
  return fmtDate(iso);
}
