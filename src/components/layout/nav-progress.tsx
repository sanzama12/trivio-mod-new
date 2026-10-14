"use client";

/**
 * Thanh tiến trình mảnh ở mép trên khi chuyển trang: hiện NGAY lúc bấm link (phản hồi tức thì),
 * chạy dần trong lúc chờ server, hoàn tất khi URL mới đã hiển thị. Không dùng loading.tsx toàn cục
 * vì streaming sẽ làm mất mã 307/404 thật của các trang cần đăng nhập / không tồn tại.
 */
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bắt đầu khi bấm một link nội bộ dẫn tới URL khác.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setVisible(true);
      setWidth(12);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => setWidth((w) => (w < 85 ? w + (90 - w) * 0.12 : w)), 180);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // URL đã đổi → hoàn tất rồi ẩn.
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setWidth((w) => (w > 0 ? 100 : 0));
    const t = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
    return () => clearTimeout(t);
  }, [pathname, search]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5" aria-hidden data-print-hide>
      <div className="h-full bg-primary-600 shadow-[0_0_8px_rgb(79_70_229/0.6)] transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}
