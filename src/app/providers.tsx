"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { LoginGateProvider } from "@/components/auth/login-gate";
import { TrovioStoreProvider, type SessionUser } from "@/stores/trovio-store";

export function Providers({ children, user }: { children: ReactNode; user: SessionUser | null }) {
  return (
    <ToastProvider>
      <TrovioStoreProvider user={user}>
        <LoginGateProvider>{children}</LoginGateProvider>
      </TrovioStoreProvider>
    </ToastProvider>
  );
}
