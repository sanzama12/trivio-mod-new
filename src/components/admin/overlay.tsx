"use client";

/** Ngăn kéo bên phải + hộp thoại xác nhận cho trang quản trị (có bẫy focus, Esc để đóng). */
import { useRef, type ReactNode } from "react";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import { useModal } from "@/components/ui/use-modal";
import { cn } from "@/lib/cn";

export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-[480px]" }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Đóng" tabIndex={-1} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="drawer-title" className={cn("absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-elevated", width)}>
        <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 id="drawer-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200" aria-label="Đóng">
            <LuX className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Dialog({ open, onClose, title, subtitle, icon, children, footer }: { open: boolean; onClose: () => void; title: string; subtitle?: string; icon?: ReactNode; children?: ReactNode; footer: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Đóng" tabIndex={-1} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" className="relative w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-elevated sm:p-8">
        <div className="flex items-start gap-4">
          {icon}
          <div className="min-w-0">
            <h2 id="dialog-title" className="text-xl font-bold text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="mt-5">{children}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

/** Phân trang phía client: ‹ 1 2 3 › (rút gọn khi nhiều trang). */
export function Pager({ page, pageCount, onChange, total, from, to, unit }: { page: number; pageCount: number; onChange: (p: number) => void; total: number; from: number; to: number; unit: string }) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  const btn = "flex size-8 items-center justify-center rounded-lg border text-sm font-semibold";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-[13px] text-slate-500">
        Hiển thị {total ? `${from}–${to}` : 0} / <span className="font-semibold text-slate-800">{total.toLocaleString("vi-VN")}</span> {unit}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Phân trang" className="flex items-center gap-1.5">
          <button type="button" className={cn(btn, "border-slate-200 text-slate-600 disabled:opacity-40")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
            <LuChevronLeft className="size-4" aria-hidden />
          </button>
          {pages.map((p, i) => (
            <span key={p} className="flex items-center gap-1.5">
              {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-slate-400">…</span>}
              <button type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} className={cn(btn, p === page ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>
                {p}
              </button>
            </span>
          ))}
          <button type="button" className={cn(btn, "border-slate-200 text-slate-600 disabled:opacity-40")} disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Trang sau">
            <LuChevronRight className="size-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

/** Cắt trang cho danh sách client. */
export function paginate<T>(items: T[], page: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), pageCount);
  return { slice: items.slice((p - 1) * size, p * size), page: p, pageCount, from: (p - 1) * size + 1, to: Math.min(p * size, items.length) };
}
