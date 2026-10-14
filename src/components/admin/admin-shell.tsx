"use client";

/**
 * Khung trang quản trị theo Figma A01–A09: thanh bên tối 240px (logo Trovio ADMIN, 9 mục dữ liệu + nhóm Cộng đồng & vận hành),
 * chân thanh bên có người dùng + đăng xuất. Màn hẹp: thanh bên thành ngăn kéo mở bằng nút menu.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  LuActivity,
  LuBookOpen,
  LuBot,
  LuBriefcase,
  LuCalendarClock,
  LuChartNoAxesColumn,
  LuFlag,
  LuFolderOpen,
  LuHouse,
  LuLandmark,
  LuLayoutGrid,
  LuLogOut,
  LuMenu,
  LuMessageCircleQuestion,
  LuMessageSquareText,
  LuPuzzle,
  LuSettings,
  LuShieldCheck,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { LogoMark } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import type { AdminSection } from "./admin-nav";

type Item = { key: AdminSection; href: string; label: string; Icon: ComponentType<{ className?: string }>; staff?: boolean };

const DATA_ITEMS: Item[] = [
  { key: "overview", href: "/quan-tri", label: "Tổng quan dữ liệu", Icon: LuLayoutGrid },
  { key: "schools", href: "/quan-tri/truong", label: "Trường & Cơ sở", Icon: LuLandmark },
  { key: "majors", href: "/quan-tri/nganh", label: "Ngành đào tạo", Icon: LuFolderOpen },
  { key: "programs", href: "/quan-tri/chuong-trinh", label: "Chương trình đào tạo", Icon: LuBookOpen },
  { key: "scores", href: "/quan-tri/diem-hoc-phi", label: "Điểm & Học phí", Icon: LuChartNoAxesColumn },
  { key: "quiz", href: "/quan-tri/trac-nghiem", label: "Bài test RIASEC", Icon: LuPuzzle },
  { key: "import", href: "/quan-tri/nhap-du-lieu", label: "Nhập & Kiểm duyệt", Icon: LuShieldCheck },
  { key: "users", href: "/quan-tri/nguoi-dung", label: "Người dùng", Icon: LuUsers },
  { key: "rules", href: "/quan-tri/quy-tac-goi-y", label: "Quy tắc gợi ý", Icon: LuSettings },
];
const OPS_ITEMS: Item[] = [
  { key: "reviews", href: "/quan-tri/cam-nhan", label: "Duyệt cảm nhận", Icon: LuMessageSquareText, staff: true },
  { key: "qa", href: "/quan-tri/hoi-dap", label: "Hỏi đáp sinh viên", Icon: LuMessageCircleQuestion, staff: true },
  { key: "reports", href: "/quan-tri/bao-loi", label: "Báo lỗi dữ liệu", Icon: LuFlag, staff: true },
  { key: "outcomes", href: "/quan-tri/viec-lam", label: "Việc làm & thu nhập", Icon: LuBriefcase },
  { key: "timeline", href: "/quan-tri/moc-tuyen-sinh", label: "Mốc tuyển sinh", Icon: LuCalendarClock },
  { key: "chatbot", href: "/quan-tri/chatbot", label: "Chatbot", Icon: LuBot },
  { key: "stats", href: "/quan-tri/thong-ke", label: "Thống kê & khảo sát", Icon: LuActivity },
];

function activeKey(path: string): AdminSection | null {
  const all = [...DATA_ITEMS, ...OPS_ITEMS].filter((i) => i.href !== "/quan-tri");
  const hit = all.find((i) => path === i.href || path.startsWith(`${i.href}/`));
  if (hit) return hit.key;
  return path === "/quan-tri" ? "overview" : null;
}

export function AdminShell({
  user,
  badges,
  children,
}: {
  user: { name: string; email: string; avatarUrl: string | null; admin: boolean };
  badges: Partial<Record<AdminSection, number>>;
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const active = activeKey(path);

  useEffect(() => setOpen(false), [path]);
  // Mục đang mở nằm thấp trong thanh bên (VD Thống kê) → cuộn tới để luôn nhìn thấy.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('aside [aria-current="page"]').forEach((el) => el.scrollIntoView({ block: "nearest" }));
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const link = (it: Item) => (
    <li key={it.key}>
      <Link
        href={it.href}
        aria-current={active === it.key ? "page" : undefined}
        title={it.label}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          active === it.key ? "bg-primary-600 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
        )}
      >
        <it.Icon className={cn("size-4 shrink-0", active === it.key ? "text-accent-200" : "text-slate-400 group-hover:text-slate-200")} />
        <span className="min-w-0 flex-1 truncate">{it.label}</span>
        {!!badges[it.key] && (
          <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-slate-900">
            {badges[it.key]}
            <span className="sr-only"> đang chờ</span>
          </span>
        )}
      </Link>
    </li>
  );

  const nav = (
    <div className="flex h-full flex-col">
      <Link href={user.admin ? "/quan-tri" : "/quan-tri/cam-nhan"} className="flex items-center gap-2.5 px-5 pt-6 pb-4" aria-label="Trovio Admin – về trang tổng quan quản trị">
        <LogoMark tone="white" className="size-9" />
        <span className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-tight text-white">Trovio</span>
          <span className="mt-1 text-[11px] font-bold tracking-[0.12em] text-accent-500">ADMIN</span>
        </span>
      </Link>
      <div className="px-4 pb-3">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          <LuHouse className="size-4" aria-hidden /> Về trang chủ Trovio
        </Link>
      </div>
      <nav aria-label="Mục quản trị" className="flex-1 overflow-y-auto px-2 pb-4">
        {user.admin && <ul className="space-y-0.5">{DATA_ITEMS.map(link)}</ul>}
        <p className="mt-5 mb-1.5 px-4 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{user.admin ? "Cộng đồng & vận hành" : "Kiểm duyệt"}</p>
        <ul className="space-y-0.5">{OPS_ITEMS.filter((i) => user.admin || i.staff).map(link)}</ul>
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <Avatar name={user.name} src={user.avatarUrl} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.admin ? "Quản trị viên" : "Kiểm duyệt viên"}</p>
        </div>
        <button type="button" onClick={logout} className="rounded-md p-1.5 text-danger-500 hover:bg-white/10" aria-label="Đăng xuất" title="Đăng xuất">
          <LuLogOut className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50">
      <a href="#noi-dung" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Bỏ qua tới nội dung
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-slate-900 lg:block" data-print-hide>
        {nav}
      </aside>
      {/* Thanh trên cho màn hẹp */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-slate-900 px-4 lg:hidden" data-print-hide>
        <button type="button" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-white hover:bg-white/10" aria-label="Mở menu quản trị" aria-expanded={open}>
          <LuMenu className="size-5" aria-hidden />
        </button>
        <LogoMark tone="white" className="size-7" />
        <span className="flex-1 text-base font-extrabold text-white">
          Trovio <span className="text-xs font-bold tracking-widest text-accent-500">ADMIN</span>
        </span>
        <Link href="/" className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[13px] font-semibold text-slate-200 hover:bg-white/10" aria-label="Về trang chủ Trovio">
          <LuHouse className="size-4" aria-hidden /> Trang chủ
        </Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu quản trị">
          <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Đóng menu" onClick={() => setOpen(false)} />
          <div ref={panel} className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-slate-900 shadow-xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-5 right-3 rounded-md p-1.5 text-slate-300 hover:bg-white/10" aria-label="Đóng menu">
              <LuX className="size-5" aria-hidden />
            </button>
            {nav}
          </div>
        </div>
      )}
      <div className="min-w-0 lg:pl-60">
        <main id="noi-dung" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
