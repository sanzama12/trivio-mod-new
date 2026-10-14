import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPassword } from "@/components/auth/forgot-password";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Khôi phục mật khẩu" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Bảo vệ hành trình của riêng bạn" subtitle="Tài khoản giúp bạn lưu trữ danh sách nguyện vọng, so sánh điểm chuẩn và theo dõi định hướng nghề nghiệp cá nhân hoá.">
      <ForgotPassword expired={token === "expired"} initialToken={token && token !== "expired" ? token.slice(0, 1000) : undefined} demo={isDemoMode()} />
    </AuthShell>
  );
}
