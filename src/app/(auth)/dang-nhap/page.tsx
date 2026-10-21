import type { Metadata } from "next";
import { safeNext } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { AuthExperience } from "@/components/auth/auth-experience";

export const metadata: Metadata = { title: "Đăng nhập / Đăng ký" };

type Props = { searchParams: Promise<{ next?: string; error?: string; mode?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error, mode } = await searchParams;
  return (
    <AuthExperience key={mode === "register" ? "register" : "login"} next={safeNext(next, "/")} error={error} demo={isDemoMode()} initialMode={mode === "register" ? "register" : "login"} />
  );
}
