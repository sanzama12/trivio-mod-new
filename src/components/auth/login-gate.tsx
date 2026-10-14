"use client";

/**
 * "Cổng đăng nhập mềm": khách vẫn tìm kiếm/xem/so sánh/làm trắc nghiệm tự do.
 * Chỉ khi dùng tính năng gắn với tài khoản (nguyện vọng, xuất PDF, chia sẻ, lưu vào hồ sơ…)
 * mới hiện hộp thoại mời đăng nhập, rồi quay lại đúng trang và tự thực hiện thao tác dang dở.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LuCloud, LuFileDown, LuListOrdered, LuLock, LuX } from "react-icons/lu";
import { useTrovio, type PendingIntent } from "@/stores/trovio-store";
import { buttonClass } from "@/components/ui/button";
import { GoogleButton } from "./google-button";
import { useModal } from "@/components/ui/use-modal";

interface GateOptions {
  title: string;
  reason: string;
  /** Thao tác sẽ tự thực hiện sau khi đăng nhập xong. */
  intent?: PendingIntent;
  /** Mềm: có nút "Để sau" (dùng cho lời nhắc, không chặn thao tác). */
  soft?: boolean;
}

interface Gate {
  /** Đã đăng nhập → chạy `action` và trả true; chưa → mở hộp thoại, trả false. */
  requireLogin: (opts: GateOptions, action?: () => void) => boolean;
  /** Lời nhắc mềm (tối đa 1 lần mỗi phiên trình duyệt). */
  nudge: (opts: Omit<GateOptions, "soft">) => void;
}

const GateContext = createContext<Gate | null>(null);
const NUDGE_KEY = "trovio:nudged";
const currentPath = () => `${window.location.pathname}${window.location.search}`;

const BENEFITS = [
  { icon: LuCloud, text: "Đồng bộ danh sách đã lưu trên mọi thiết bị" },
  { icon: LuListOrdered, text: "Lập, sắp xếp nguyện vọng dự kiến và ghi chú" },
  { icon: LuFileDown, text: "Xuất PDF, chia sẻ danh sách với gia đình" },
];

export function LoginGateProvider({ children }: { children: ReactNode }) {
  const { user, setPendingIntent } = useTrovio();
  const [open, setOpen] = useState<(GateOptions & { next: string }) | null>(null);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setPendingIntent(null);
    setOpen(null);
  }, [setPendingIntent]);

  const requireLogin = useCallback<Gate["requireLogin"]>(
    (opts, action) => {
      if (user) {
        action?.();
        return true;
      }
      setPendingIntent(opts.intent ?? null);
      setOpen({ ...opts, next: currentPath() });
      return false;
    },
    [user, setPendingIntent],
  );

  const nudge = useCallback<Gate["nudge"]>(
    (opts) => {
      if (user) return;
      try {
        if (window.sessionStorage.getItem(NUDGE_KEY)) return;
        window.sessionStorage.setItem(NUDGE_KEY, "1");
      } catch {
        return;
      }
      setOpen({ ...opts, soft: true, next: currentPath() });
    },
    [user],
  );

  useEffect(() => setOpen(null), [pathname]);
  useModal(dialogRef, !!open, close);

  const next = open?.next ?? "/";
  const enc = encodeURIComponent(next);

  return (
    <GateContext.Provider value={{ requireLogin, nudge }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={close} data-print-hide>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-2xl bg-white p-6 shadow-elevated sm:rounded-2xl"
          >
            <button type="button" onClick={close} className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              <LuX className="size-5" />
            </button>
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <LuLock className="size-6" aria-hidden />
            </span>
            <h2 id="gate-title" className="mt-4 text-xl font-bold text-slate-900">
              {open.title}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">{open.reason}</p>
            <ul className="mt-4 space-y-2">
              {BENEFITS.map((b) => (
                <li key={b.text} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <b.icon className="size-4 shrink-0 text-primary-600" aria-hidden /> {b.text}
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-3">
              <GoogleButton next={next} />
              <Link href={`/dang-nhap?next=${enc}`} className={buttonClass({ full: true })}>
                Đăng nhập bằng email
              </Link>
            </div>
            <p className="mt-4 text-center text-sm text-slate-600">
              Chưa có tài khoản?{" "}
              <Link href={`/dang-ky?next=${enc}`} className="font-semibold text-primary-600 hover:underline">
                Đăng ký miễn phí
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-slate-500">Những gì bạn đã lưu trên máy này sẽ được giữ nguyên và gộp vào tài khoản.</p>
            {open.soft && (
              <button type="button" onClick={close} className="mt-3 w-full text-center text-sm text-slate-500 underline-offset-4 hover:underline">
                Để sau, tiếp tục không cần tài khoản
              </button>
            )}
          </div>
        </div>
      )}
    </GateContext.Provider>
  );
}

export function useLoginGate(): Gate {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error("useLoginGate phải nằm trong <LoginGateProvider>");
  return ctx;
}
