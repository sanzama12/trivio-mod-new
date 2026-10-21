import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Đăng ký" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  redirect(`/dang-nhap?mode=register&next=${encodeURIComponent(safeNext(next, "/"))}`);
}
