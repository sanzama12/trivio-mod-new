import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Đăng ký" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Bắt đầu hành trình của bạn" subtitle="Tạo tài khoản miễn phí để lưu chương trình, lưu kết quả trắc nghiệm và lập nguyện vọng dự kiến.">
      <RegisterForm next={safeNext(next, "/")} />
    </AuthShell>
  );
}
