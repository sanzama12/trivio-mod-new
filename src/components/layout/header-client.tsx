"use client";

/**
 * Thanh điều hướng tự co giãn — mọi mục luôn nằm trên MỘT dòng:
 * 1. Đo chiều rộng thật (theo font đang hiển thị, cỡ chữ người dùng, zoom trình duyệt…).
 * 2. Không đủ chỗ → lần lượt thu gọn: nhãn "Đã lưu" ngắn → chỉ biểu tượng + bỏ tên người dùng → chữ menu 14px
 *    → chữ 13px và bỏ dòng khẩu hiệu dưới logo (giới hạn dưới, vẫn dễ đọc).
 * 3. Vẫn không đủ → chuyển sang giao diện di động (nút menu ☰), kể cả trên màn hình rộng.
 * Trước khi JavaScript chạy: dùng breakpoint CSS (≥ 1280px hiện menu ngang ở mức gọn; nút bên phải chỉ còn biểu tượng
 * để HTML ban đầu không bao giờ tràn ngang).
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuBookmark, LuCalendarDays, LuChevronDown, LuDatabase, LuHeart, LuLogOut, LuMenu, LuSchool, LuUser, LuX } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { useTrovio } from "@/stores/trovio-store";
import { buttonClass } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Logo } from "./logo";

const NAV = [
  { href: "/chuong-trinh", label: "Tìm chương trình", match: ["/chuong-trinh", "/truong", "/diem-cua-toi"] },
  { href: "/nganh", label: "Khám phá ngành", match: ["/nganh"] },
  { href: "/trac-nghiem", label: "Trắc nghiệm sở thích", match: ["/trac-nghiem"] },
  { href: "/viec-lam", label: "Việc làm", match: ["/viec-lam"] },
  { href: "/so-sanh", label: "So sánh", match: ["/so-sanh"] },
  { href: "/moc-tuyen-sinh", label: "Mốc tuyển sinh", match: ["/moc-tuyen-sinh"] },
];

/** 0 = rộng rãi nhất … 4 = gọn nhất (chữ 13px); "mobile" = menu ☰. */
type Mode = 0 | 1 | 2 | 3 | 4 | "mobile";
const NEXT: Record<string, Mode> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: "mobile" };
const DESKTOP_MIN = 1024; // dưới mức này luôn dùng giao diện di động
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type HeaderUser = { name: string; email: string; avatarUrl: string | null; admin: boolean; teacher?: boolean; moderator?: boolean; schoolStaff?: boolean } | null;

export function HeaderClient({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { wishlist, saved, hydrated } = useTrovio();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  /** null = chưa đo (trước khi JS chạy) → dùng breakpoint CSS. */
  const [mode, setMode] = useState<Mode | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const lastWidth = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const count = hydrated ? new Set([...saved, ...wishlist.map((w) => w.id)]).size : 0;

  /** Đo lại: bắt đầu từ mức rộng nhất, mỗi lần tràn thì thu gọn một bậc (chạy trước khi vẽ nên không nháy). */
  const remeasure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    lastWidth.current = row.clientWidth;
    setMode(window.innerWidth < DESKTOP_MIN ? "mobile" : 0);
    setTick((t) => t + 1);
  }, []);

  useIsoLayoutEffect(() => {
    if (mode === null || mode === "mobile") return;
    const row = rowRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!row || !left || !right) return;
    const style = getComputedStyle(row);
    const avail = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const need = left.scrollWidth + right.scrollWidth + 24;
    if (need > avail) setMode(NEXT[mode]);
  }, [mode, user, count, tick]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    remeasure();
    const ro = new ResizeObserver(() => {
      if (Math.abs(row.clientWidth - lastWidth.current) > 1) remeasure();
    });
    ro.observe(row);
    // Font web tải xong có thể làm chữ rộng hơn → đo lại.
    document.fonts?.ready.then(remeasure).catch(() => undefined);
    return () => ro.disconnect();
  }, [remeasure]);

  const isActive = (m: string[]) => m.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const onSavedPage = pathname.startsWith("/da-luu");
  const mobile = mode === "mobile";
  // Chưa đo (HTML từ server, trước khi JS chạy): dùng mức gọn (2) để không tràn ngang trên điện thoại lẫn màn 1280px.
  const level = typeof mode === "number" ? mode : mode === null ? 2 : 1;
  const compactRight = mobile || mode === null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  // Lớp CSS theo trạng thái: chưa đo → breakpoint; đã đo → theo mức.
  const navVisible = mode === null ? "hidden xl:flex" : mobile ? "hidden" : "flex";
  const burgerVisible = mode === null ? "flex xl:hidden" : mobile ? "flex" : "hidden";
  // Thứ tự thu gọn: ưu tiên giữ cỡ chữ menu (dễ đọc) → rút gọn nút bên phải trước, rồi mới giảm chữ.
  const navText = level <= 2 ? "text-[15px]" : level === 3 ? "text-sm" : "text-[13px]";
  const navGap = level === 0 ? "gap-7" : level === 1 ? "gap-6" : level <= 3 ? "gap-5" : "gap-4";
  const savedLabel = level === 0 ? "full" : level === 1 ? "short" : "icon";
  const showName = level <= 1;
  const showTagline = level <= 3;

  return (
    <>
      <a
        href="#noi-dung"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-lg focus:bg-primary-700 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-elevated"
      >
        Bỏ qua, đến nội dung chính
      </a>
      <header data-site-header data-mode={mode ?? "css"} className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div ref={rowRef} className="container-page flex h-16 items-center justify-between gap-3 sm:gap-6 md:h-20">
          <div ref={leftRef} className={cn("flex shrink-0 items-center", level <= 1 ? "gap-10" : "gap-6")}>
            <Logo compact={!showTagline} taglineFromSm />
            <nav aria-label="Điều hướng chính" className={cn("items-center whitespace-nowrap", navVisible, navText, navGap)}>
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.match) ? "page" : undefined}
                  data-tour={n.href === "/trac-nghiem" ? "nav-quiz" : undefined}
                  className={cn(
                    "relative py-2 transition-colors",
                    isActive(n.match) ? "font-semibold text-primary-600" : "font-medium text-slate-700 hover:text-primary-600",
                  )}
                >
                  {n.label}
                  {isActive(n.match) && <span aria-hidden className="absolute inset-x-0 -bottom-[22px] h-0.5 rounded-full bg-primary-600" />}
                </Link>
              ))}
            </nav>
          </div>

          <div ref={rightRef} className="flex shrink-0 items-center gap-2 whitespace-nowrap sm:gap-3">
            <Link
              href="/da-luu"
              data-tour="saved"
              aria-label={savedLabel === "icon" || mobile ? `Đã lưu & Nguyện vọng${count ? ` (${count})` : ""}` : undefined}
              title="Đã lưu & Nguyện vọng"
              className={cn(
                "h-10 items-center gap-2 rounded-full border text-sm font-medium transition-colors",
                compactRight ? "hidden sm:flex" : "flex",
                savedLabel === "icon" || mobile ? "px-3" : "px-4",
                onSavedPage ? "border-primary-200 bg-primary-50 font-semibold text-primary-700" : "border-slate-200 text-slate-700 hover:border-primary-200",
              )}
            >
              <LuHeart className="size-4 shrink-0" aria-hidden />
              {!mobile && savedLabel === "full" && <span>Đã lưu & Nguyện vọng</span>}
              {!mobile && savedLabel === "short" && <span>Đã lưu</span>}
              {count > 0 && (
                <span aria-hidden={savedLabel === "icon" || mobile} className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-slate-900">
                  {count}
                </span>
              )}
            </Link>

            {user && <NotificationBell />}

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenu((v) => !v)}
                  aria-expanded={menu}
                  aria-haspopup="menu"
                  aria-label={`Tài khoản: ${user.name}`}
                  className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-3 pl-1 hover:border-primary-200"
                >
                  <Avatar name={user.name} src={user.avatarUrl} className="size-8 text-xs" />
                  {showName && !mobile && <span className="max-w-[9rem] truncate text-sm font-semibold text-slate-900">{user.name}</span>}
                  <LuChevronDown className="size-4 text-slate-500" aria-hidden />
                </button>
                {menu && (
                  <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-elevated">
                    <p className="truncate px-4 pb-1 text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate px-4 pb-2 text-xs text-slate-500">{user.email}</p>
                    <Link role="menuitem" href="/ho-so" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                      <LuUser className="size-4" aria-hidden /> Hồ sơ cá nhân
                    </Link>
                    <Link role="menuitem" href="/da-luu" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                      <LuBookmark className="size-4" aria-hidden /> Đã lưu & Nguyện vọng
                    </Link>
                    <Link role="menuitem" href="/moc-tuyen-sinh" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                      <LuCalendarDays className="size-4" aria-hidden /> Mốc tuyển sinh
                    </Link>
                    <Link role="menuitem" href="/lop-hoc" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                      <LuSchool className="size-4" aria-hidden /> {user.teacher ? "Lớp chủ nhiệm" : "Lớp học (mã lớp)"}
                    </Link>
                    {user.admin ? (
                      <Link role="menuitem" href="/quan-tri" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <LuDatabase className="size-4" aria-hidden /> Quản trị dữ liệu
                      </Link>
                    ) : user.moderator ? (
                      <Link role="menuitem" href="/quan-tri/cam-nhan" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <LuDatabase className="size-4" aria-hidden /> Kiểm duyệt nội dung
                      </Link>
                    ) : null}
                    {user.schoolStaff && (
                      <Link role="menuitem" href="/cong-truong" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                        <LuSchool className="size-4" aria-hidden /> Cổng trường
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger-700 hover:bg-danger-50"
                    >
                      <LuLogOut className="size-4" aria-hidden /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href={`/dang-nhap?next=${encodeURIComponent(pathname)}`} className={buttonClass({ size: "sm", className: "h-10 px-5" })}>
                Đăng nhập
              </Link>
            )}

            <button
              type="button"
              className={cn("size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100", burgerVisible)}
              aria-label={open ? "Đóng menu" : "Mở menu"}
              aria-expanded={open}
              aria-controls="menu-di-dong"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <LuX className="size-5" aria-hidden /> : <LuMenu className="size-5" aria-hidden />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="menu-di-dong" aria-label="Menu di động" className="border-t border-slate-200 bg-white">
            <div className="container-page grid gap-1 py-2 sm:grid-cols-2">
              {[...NAV, { href: "/da-luu", label: `Đã lưu & Nguyện vọng${count ? ` (${count})` : ""}`, match: ["/da-luu"] }].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.match) ? "page" : undefined}
                  className={cn("rounded-lg px-3 py-3 text-[15px]", isActive(n.match) ? "bg-primary-50 font-semibold text-primary-700" : "text-slate-700 hover:bg-slate-50")}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
