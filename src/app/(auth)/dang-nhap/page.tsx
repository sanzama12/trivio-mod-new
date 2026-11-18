import type { Metadata } from "next";
import { safeNext } from "@/lib/auth";
import { isLocalDemoLoginEnabled } from "@/lib/env";
import { AuthExperience } from "@/components/auth/auth-experience";
import { DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD } from "@/domain/demo-account";

export const metadata: Metadata = { title: "Đăng nhập / Đăng ký" };

type Props = { searchParams: Promise<{ next?: string; error?: string; mode?: string; registered?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error, mode, registered } = await searchParams;
  return (
    <AuthExperience key={mode === "register" ? "register" : "login"} next={safeNext(next, "/")} error={error} demoAccount={isLocalDemoLoginEnabled() ? { email: DEMO_STUDENT_EMAIL, password: DEMO_STUDENT_PASSWORD } : null} initialMode={mode === "register" ? "register" : "login"} registered={registered === "1" && mode !== "register"} />
  );
}
