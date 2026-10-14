import type { ReactNode } from "react";
import Link from "next/link";
import { LuHouse, LuSearch } from "react-icons/lu";
import { getCurrentUser } from "@/lib/auth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar } from "@/components/ui/avatar";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

/** Thanh trên của trang quản trị: tiêu đề + đường dẫn "Admin > …" · ngày cập nhật, ô tìm kiếm, chuông, người dùng. */
export async function AdminHeader({ title, crumb, updatedAt, actions, search = false }: { title: string; crumb: string; updatedAt?: string | null; actions?: ReactNode; search?: boolean }) {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-slate-200 bg-white" data-print-hide>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Admin &gt; {crumb}
            {updatedAt ? ` · Cập nhật ${fmt(updatedAt)}` : ""}
          </p>
        </div>
        {search && (
          <form action="/quan-tri/chuong-trinh" role="search" className="hidden w-80 md:block">
            <label className="relative block">
              <span className="sr-only">Tìm trường, ngành, chương trình</span>
              <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input name="q" type="search" placeholder="Tìm trường, ngành, chương trình…" className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none" />
            </label>
          </form>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[13px] font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 lg:inline-flex"
            title="Về trang chủ Trovio (giao diện học sinh)"
          >
            <LuHouse className="size-4" aria-hidden /> Trang chủ
          </Link>
          <NotificationBell />
          {user && (
            <span className="hidden items-center gap-2.5 border-l border-slate-200 pl-4 sm:flex">
              <Avatar name={user.name} src={user.avatarUrl} className="size-9 text-xs" />
              <span className="text-sm font-semibold text-slate-800">{user.name}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
