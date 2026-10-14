import type { Metadata } from "next";
import { safeNext } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  return (
    <AuthShell>
      <LoginForm next={safeNext(next, "/")} error={error} demo={isDemoMode()} />
    </AuthShell>
  );
}
