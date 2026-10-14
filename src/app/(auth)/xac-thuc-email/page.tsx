import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmail } from "@/components/auth/verify-email";
import { safeNext } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Xác thực email" };

type Props = { searchParams: Promise<{ email?: string; next?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email = "", next } = await searchParams;
  return (
    <AuthShell title="Bảo mật tài khoản của bạn" subtitle="Một bước cuối cùng để kích hoạt tài khoản và đồng bộ lựa chọn của bạn.">
      <VerifyEmail email={email.slice(0, 200)} next={safeNext(next, "/")} demo={isDemoMode()} />
    </AuthShell>
  );
}
