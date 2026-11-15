"use client";

/**
 * Hệ thống thông báo nổi (Toast / Notification) tiêu chuẩn Boutique Design:
 * - Bo góc mượt mà rounded-2xl, viền hairline tinh tế, đổ bóng đa tầng không thô cứng.
 * - Huy hiệu trạng thái (Success / Info / Warning / Error) trang nhã.
 * - Thanh tiến trình (Progress runner) mượt mà phản hồi thời gian tự biến mất, tự dừng khi rê chuột (pause on hover).
 * - Hoàn toàn tương thích ngược: toast(msg, tone?, { action?, duration?, description? }).
 */
import { buttonClass } from "@/components/ui/button";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  LuCircleCheck,
  LuCircleX,
  LuInfo,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastOptions {
  action?: { label: string; onClick: () => void };
  duration?: number;
  title?: string;
  description?: string;
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastOptions["action"];
  duration?: number;
  title?: string;
  description?: string;
}

type Push = (message: string, tone?: ToastTone, opts?: ToastOptions) => void;
const ToastContext = createContext<Push>(() => {});

const STYLE: Record<
  ToastTone,
  {
    Icon: typeof LuCircleCheck;
    badge: string;
    containerBorder: string;
    progress: string;
  }
> = {
  success: {
    Icon: LuCircleCheck,
    badge: "bg-emerald-50 text-emerald-600 border border-emerald-200/70",
    containerBorder: "border-slate-200/90 hover:border-emerald-300/80",
    progress: "bg-emerald-500",
  },
  info: {
    Icon: LuInfo,
    badge: "bg-primary-50 text-primary-700 border border-primary-200/70",
    containerBorder: "border-slate-200/90 hover:border-primary-300/80",
    progress: "bg-primary-600",
  },
  warning: {
    Icon: LuTriangleAlert,
    badge: "bg-amber-50 text-amber-700 border border-amber-200/70",
    containerBorder: "border-slate-200/90 hover:border-amber-300/80",
    progress: "bg-amber-500",
  },
  error: {
    Icon: LuCircleX,
    badge: "bg-rose-50 text-rose-600 border border-rose-200/70",
    containerBorder: "border-slate-200/90 hover:border-rose-300/80",
    progress: "bg-rose-500",
  },
};

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [closing, setClosing] = useState(false);
  const duration =
    toast.duration ??
    (toast.tone === "error" || toast.tone === "warning" || toast.action
      ? 5000
      : 3500);

  const triggerClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(toast.id), 180);
  }, [onClose, toast.id]);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      triggerClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [paused, duration, triggerClose]);

  const s = STYLE[toast.tone];

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "pointer-events-auto group relative flex w-full max-w-[390px] flex-col overflow-hidden rounded-2xl border bg-white/98 shadow-xl shadow-slate-900/10 backdrop-blur-md transition-all duration-200",
        s.containerBorder,
        closing
          ? "animate-out fade-out slide-out-to-top-2 sm:slide-out-to-right-2 duration-180"
          : "animate-in fade-in slide-in-from-top-4 sm:slide-in-from-right-4 duration-250 ease-out"
      )}
    >
      <div className="flex items-center gap-3 p-3.5 sm:p-4">
        {/* Biểu tượng trạng thái trang nhã */}
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-2xs",
            s.badge
          )}
        >
          <s.Icon className="size-4.5" aria-hidden />
        </div>

        {/* Nội dung thông báo */}
        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className="mb-0.5 text-xs font-semibold tracking-wide text-slate-600">
              {toast.title}
            </p>
          )}
          <p className="text-sm font-semibold tracking-tight text-slate-900 leading-snug">
            {toast.message}
          </p>
          {toast.description && (
            <p className="mt-0.5 text-xs leading-normal text-slate-600">
              {toast.description}
            </p>
          )}
        </div>

        {/* Nút hành động bổ trợ (VD: Hoàn tác, Xem ngay) */}
        {toast.action && (
          <button
            type="button"
            className={buttonClass({ variant: "secondary", size: "sm" })}
            onClick={() => {
              toast.action?.onClick();
              triggerClose();
            }}
          >
            {toast.action.label}
          </button>
        )}

        {/* Nút đóng */}
        <button
          type="button"
          onClick={triggerClose}
          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center size-10 rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <LuX className="size-4" aria-hidden />
        </button>
      </div>

      {/* Thanh tiến trình tự động biến mất */}
      <div className="h-0.5 w-full bg-slate-100/80 overflow-hidden">
        <div
          className={cn("h-full transition-all", s.progress)}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const close = useCallback(
    (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  const push = useCallback<Push>(
    (message, tone = "success", opts = {}) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [
        ...t.slice(-2),
        {
          id,
          message,
          tone,
          action: opts.action,
          duration: opts.duration,
          title: opts.title,
          description: opts.description,
        },
      ]);
    },
    []
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-5 z-[9999] flex flex-col items-center gap-2.5 px-4 sm:inset-x-auto sm:right-6 sm:top-6 sm:items-end"
        data-print-hide
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={close} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
