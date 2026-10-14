"use client";

/**
 * Thông báo nổi theo UI Patterns (Figma): rộng tối đa 400px, viền trái theo trạng thái, nút ✕ đóng,
 * tuỳ chọn hành động (VD "Hoàn tác"). Lỗi giữ lâu hơn để kịp đọc. Gọi: toast(msg, tone?, { action?, duration? }).
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { LuCircleCheck, LuCircleX, LuInfo, LuTriangleAlert, LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "info" | "warning" | "error";
export interface ToastOptions {
  action?: { label: string; onClick: () => void };
  duration?: number;
}
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastOptions["action"];
}

type Push = (message: string, tone?: ToastTone, opts?: ToastOptions) => void;
const ToastContext = createContext<Push>(() => {});

const STYLE: Record<ToastTone, { Icon: typeof LuInfo; border: string; icon: string }> = {
  success: { Icon: LuCircleCheck, border: "border-l-success-500", icon: "text-success-700" },
  error: { Icon: LuCircleX, border: "border-l-danger-500", icon: "text-danger-600" },
  info: { Icon: LuInfo, border: "border-l-primary-600", icon: "text-primary-600" },
  warning: { Icon: LuTriangleAlert, border: "border-l-accent-500", icon: "text-accent-700" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const close = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback<Push>(
    (message, tone = "success", opts = {}) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, message, tone, action: opts.action }]);
      setTimeout(() => close(id), opts.duration ?? (tone === "error" || tone === "warning" || opts.action ? 6000 : 3500));
    },
    [close],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end" data-print-hide>
        {toasts.map((t) => {
          const s = STYLE[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn("pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-xl border border-l-4 border-slate-200 bg-white py-3 pr-3 pl-4 text-sm font-semibold text-slate-900 shadow-elevated", s.border)}
            >
              <s.Icon className={cn("size-5 shrink-0", s.icon)} aria-hidden />
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-800"
                  onClick={() => {
                    t.action?.onClick();
                    close(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" onClick={() => close(t.id)} className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng thông báo">
                <LuX className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
