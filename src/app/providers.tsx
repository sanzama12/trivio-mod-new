"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTrovio } from "@/stores/trovio-store";
import { journeyKey } from "@/lib/journey";
import { ToastProvider } from "@/components/ui/toast";
import { LoginGateProvider } from "@/components/auth/login-gate";
import { TrovioStoreProvider, type SessionUser } from "@/stores/trovio-store";

function JourneyTracker() {
  const path = usePathname();
  const { profile, journeyReady, user } = useTrovio();
  useEffect(() => {
    if (!journeyReady) return;
    try {
      if (/^\/nganh\/[^/]+/.test(path)) localStorage.setItem(journeyKey("explored", user?.id ?? null), "1");
      if (path === "/chuong-trinh" && profile) localStorage.setItem(journeyKey("suggestions", user?.id ?? null), "1");
    } catch { /* storage không khả dụng */ }
  }, [path, profile, journeyReady, user]);
  return null;
}

export function Providers({ children, user }: { children: ReactNode; user: SessionUser | null }) {
  return (
    <ToastProvider>
      <TrovioStoreProvider user={user}>
        <JourneyTracker /><LoginGateProvider>{children}</LoginGateProvider>
      </TrovioStoreProvider>
    </ToastProvider>
  );
}
