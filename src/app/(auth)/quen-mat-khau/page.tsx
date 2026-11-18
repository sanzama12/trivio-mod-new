import type { Metadata } from "next";
import { AuthExperienceShell } from "@/components/auth/auth-experience-shell";
import { ForgotPassword } from "@/components/auth/forgot-password";

export const metadata: Metadata = { title: "Khôi phục mật khẩu" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AuthExperienceShell>
      <ForgotPassword expired={token === "expired"} initialToken={token && token !== "expired" ? token.slice(0, 1000) : undefined} />
    </AuthExperienceShell>
  );
}
