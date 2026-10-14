"use client";

/** Cảnh báo "Phiên sẽ hết hạn sau 5 phút" (UI Patterns · toast cảnh báo) kèm nút gia hạn. */
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

const WARN_MS = 5 * 60_000;

export function SessionWatch() {
  const toast = useToast();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const schedule = async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as { sessionExpiresAt?: string | null } | null;
      if (cancelled || !json?.sessionExpiresAt) return;
      const wait = Date.parse(json.sessionExpiresAt) - WARN_MS - Date.now();
      if (!Number.isFinite(wait) || wait > 2_000_000_000) return;
      timer = setTimeout(() => {
        toast("Phiên sẽ hết hạn sau 5 phút.", "warning", {
          duration: 60_000,
          action: {
            label: "Gia hạn",
            onClick: async () => {
              const r = await fetch("/api/auth/refresh", { method: "POST" }).catch(() => null);
              if (r?.ok) {
                toast("Đã gia hạn phiên đăng nhập.", "success");
                void schedule();
              } else toast("Không gia hạn được — hãy đăng nhập lại.", "error");
            },
          },
        });
      }, Math.max(0, wait));
    };
    void schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [toast]);
  return null;
}
