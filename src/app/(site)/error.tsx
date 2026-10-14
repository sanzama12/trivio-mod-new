"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import { Button, buttonClass } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-accent-100 text-accent-700">
        <LuTriangleAlert className="size-10" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold">Đã xảy ra lỗi hệ thống</h1>
      <p className="mt-3 max-w-lg text-slate-600">Hệ thống cơ sở dữ liệu đang gặp sự cố. Chúng tôi đang khắc phục để không ảnh hưởng đến trải nghiệm của bạn. Vui lòng thử lại sau ít phút.</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Thử lại ngay</Button>
        <Link href="/" className={buttonClass({ variant: "outline" })}>
          Về trang chủ
        </Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Mã lỗi: {error.digest ?? "không có"} · {new Date().toLocaleString("vi-VN")} · Gửi mã này tới support@trovio.vn nếu lỗi lặp lại.
      </p>
    </div>
  );
}
