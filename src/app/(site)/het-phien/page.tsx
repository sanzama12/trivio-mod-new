import type { Metadata } from "next";
import Link from "next/link";
import { LuClock } from "react-icons/lu";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Phiên đăng nhập đã hết hạn" };

export default function SessionExpiredPage() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <LuClock className="size-10" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold">Phiên đăng nhập đã hết hạn</h1>
      <p className="mt-3 max-w-lg text-slate-600">
        Để bảo mật, phiên làm việc tự động kết thúc sau một thời gian không hoạt động. Danh sách đã lưu trên trình duyệt này vẫn được giữ nguyên.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/dang-nhap" className={buttonClass()}>
          Đăng nhập lại
        </Link>
        <Link href="/" className={buttonClass({ variant: "outline" })}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
