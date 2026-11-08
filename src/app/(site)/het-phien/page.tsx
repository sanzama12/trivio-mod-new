import type { Metadata } from "next";
import Link from "next/link";
import { LuClock } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Phiên đăng nhập đã hết hạn" };

export default async function SessionExpiredPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const requested = (await searchParams).next;
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <LuClock className="size-10" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight">Phiên đăng nhập đã hết hạn</h1>
      <p className="mt-3 max-w-lg text-slate-600">
        Để bảo mật, dữ liệu đã đồng bộ được xoá khỏi thiết bị khi phiên kết thúc. Dữ liệu sẽ quay lại khi bạn đăng nhập lại.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className={buttonClass()}>
          Đăng nhập lại
        </Link>
        <Link href="/" className={buttonClass({ variant: "outline" })}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
