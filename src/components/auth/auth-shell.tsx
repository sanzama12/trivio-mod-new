import type { ReactNode } from "react";
import { LuGraduationCap, LuSchool, LuSparkles } from "react-icons/lu";
import { Logo } from "@/components/layout/logo";

/** Bố cục 2 cột dùng chung cho đăng nhập / đăng ký / quên mật khẩu. */
export function AuthShell({ children, title = "Tìm đúng trường, chọn đúng ngành", subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-accent-500/20" />
        <Logo tone="white" />
        <div className="relative my-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <LuSparkles className="size-3.5 text-accent-200" aria-hidden /> Nền tảng hướng nghiệp 2026
          </span>
          <div className="relative mt-8 flex h-48 max-w-sm items-center justify-center rounded-3xl border border-white/20 bg-white/10 backdrop-blur">
            <LuGraduationCap className="size-16 text-white/90" aria-hidden />
            <span className="absolute -left-6 top-8 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-elevated">
              <LuSchool className="size-3.5 text-primary-600" aria-hidden /> Điểm chuẩn 3 năm
            </span>
            <span className="absolute -right-6 bottom-8 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-elevated">Trắc nghiệm RIASEC</span>
          </div>
          <h2 className="mt-10 text-3xl font-bold">{title}</h2>
          <p className="mt-3 max-w-md text-primary-100">
            {subtitle ?? "Khởi đầu tương lai của bạn với dữ liệu tuyển sinh minh bạch, so sánh chương trình và gợi ý cá nhân hoá."}
          </p>
        </div>
        <p className="relative text-sm text-primary-100 italic">“Tương lai bắt đầu từ sự lựa chọn đúng đắn” — Trovio</p>
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </div>
    </div>
  );
}
