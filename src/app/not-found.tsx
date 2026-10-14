import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="noi-dung" className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="flex size-32 items-center justify-center rounded-full bg-primary-50 text-5xl font-extrabold text-primary-300">404</p>
        <h1 className="mt-6 text-3xl font-bold">Trang bạn tìm không tồn tại</h1>
        <p className="mt-3 max-w-md text-slate-600">Liên kết này có thể đã thay đổi, hết hạn hoặc trang đã bị gỡ bỏ trong đợt cập nhật dữ liệu tuyển sinh.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClass()}>
            Về trang chủ
          </Link>
          <Link href="/chuong-trinh" className={buttonClass({ variant: "outline" })}>
            Tìm chương trình
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
