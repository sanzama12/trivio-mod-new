"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { isFirebaseConfigured, signInWithGoogleFirebase } from "@/lib/firebase";

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-[18px]", className)} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

interface GoogleButtonProps {
  next: string;
  label?: string;
  mode?: "link";
  disabled?: boolean;
  onError?: (msg: string) => void;
  onClick?: () => void;
}

/**
 * Nút đăng nhập / liên kết tài khoản bằng Google:
 * - Ưu tiên Firebase Authentication (popup 1 chạm tiện lợi, an toàn).
 * - Tự động fallback sang luồng OAuth chuẩn nếu chưa cấu hình Firebase client.
 */
export function GoogleButton({
  next,
  label = "Tiếp tục với Google",
  mode,
  disabled = false,
  onError,
  onClick,
}: GoogleButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const qs = new URLSearchParams({ next });
  if (mode) qs.set("mode", mode);
  const fallbackHref = `/api/auth/google?${qs}`;

  async function handleFirebaseGoogleClick(e: React.MouseEvent) {
    if (onClick) onClick();

    // Nếu Firebase chưa được cung cấp thông tin cấu hình, để người dùng chạy theo link href truyền thống
    if (!isFirebaseConfigured()) {
      return;
    }

    // Đã cấu hình Firebase: chặn điều hướng trang để mở Popup đăng nhập
    e.preventDefault();
    if (loading || disabled) return;

    setLoading(true);
    if (onError) onError("");

    try {
      const { idToken } = await signInWithGoogleFirebase();

      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, next, mode }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        const dest = data.redirect || next;
        router.push(dest);
        router.refresh();
        return;
      }

      const errMsg =
        data.error || "Không thể đăng nhập bằng Google qua Firebase. Vui lòng thử lại.";
      if (onError) onError(errMsg);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // Người dùng tự tắt popup hoặc mở popup mới, không báo lỗi đỏ
        return;
      }
      if (code === "auth/unauthorized-domain") {
        const domainMsg =
          "Tên miền hiện tại chưa được cấp quyền trong Firebase Console (Authentication > Settings > Authorized domains).";
        if (onError) onError(domainMsg);
        else alert(domainMsg);
        return;
      }
      if (code === "auth/popup-blocked") {
        const blockedMsg = "Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy bấm cho phép pop-up nhé!";
        if (onError) onError(blockedMsg);
        else alert(blockedMsg);
        return;
      }

      const message = err instanceof Error ? err.message : "Đăng nhập Google thất bại.";
      if (onError) onError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleFirebaseGoogleClick}
      aria-disabled={loading || disabled}
      className={buttonClass({
        variant: "outline",
        full: true,
        className: cn(
          "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-all",
          (loading || disabled) && "opacity-70 pointer-events-none cursor-not-allowed"
        ),
      })}
    >
      <GoogleIcon />
      {loading ? "Đang kết nối Google..." : label}
    </a>
  );
}
