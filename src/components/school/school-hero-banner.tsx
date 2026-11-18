"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  LuBuilding2,
  LuCheck,
  LuChevronDown,
  LuCoins,
  LuGraduationCap,
  LuMapPin,
  LuRotateCcw,
  LuSearch,
  LuSparkles,
  LuX,
} from "react-icons/lu";
import type { MajorGroup, Region, SchoolType } from "@/domain/types";
import {
  REGION_LABELS,
  SCHOOL_TYPE_LABELS,
  TUITION_RANGES,
  serializeProgramFilters,
  type ProgramFilters,
  type TuitionRange,
} from "@/services/program.filters";
import { cn } from "@/lib/cn";

interface SchoolHeroBannerProps {
  filters: ProgramFilters;
  groups: MajorGroup[];
  totalSchools?: number;
}

/** Biểu tượng ngôi sao 8-bit Pixel (Pixel Star) chuẩn RPG hoài cổ */
function PixelStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <rect x="7" y="1" width="2" height="3" />
      <rect x="7" y="12" width="2" height="3" />
      <rect x="1" y="7" width="3" height="2" />
      <rect x="12" y="7" width="3" height="2" />
      <rect x="5" y="4" width="6" height="8" />
      <rect x="4" y="5" width="8" height="6" />
      <rect x="6" y="3" width="4" height="2" />
      <rect x="6" y="11" width="4" height="2" />
      <rect x="3" y="6" width="2" height="4" />
      <rect x="11" y="6" width="2" height="4" />
    </svg>
  );
}

/** Biểu tượng kim cương lấp lánh Pixel 8-bit */
function PixelSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={className} fill="currentColor" aria-hidden="true">
      <rect x="4" y="1" width="2" height="8" />
      <rect x="1" y="4" width="8" height="2" />
      <rect x="3" y="3" width="4" height="4" />
    </svg>
  );
}

export function SchoolHeroBanner({ filters, groups, totalSchools }: SchoolHeroBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(filters.q ?? "");
  const [activeDropdown, setActiveDropdown] = useState<"region" | "type" | "group" | "tuition" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đồng bộ ô tìm kiếm khi URL thay đổi
  useEffect(() => {
    setQuery(filters.q ?? "");
  }, [filters.q]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const applyPatch = useCallback(
    (patch: Partial<ProgramFilters>) => {
      const next = { ...filters, ...patch, page: undefined };
      const q = serializeProgramFilters(next);
      startTransition(() => {
        router.push(`${pathname}${q}`, { scroll: false });
      });
    },
    [filters, pathname, router]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyPatch({ q: query.trim() || undefined });
  };

  const handleClearSearch = () => {
    setQuery("");
    applyPatch({ q: undefined });
  };

  const toggleRegion = (reg: Region) => {
    const current = filters.regions ?? [];
    const next = current.includes(reg) ? current.filter((r) => r !== reg) : [...current, reg];
    applyPatch({ regions: next.length ? next : undefined });
  };

  const toggleType = (t: SchoolType) => {
    const current = filters.types ?? [];
    const next = current.includes(t) ? current.filter((item) => item !== t) : [...current, t];
    applyPatch({ types: next.length ? next : undefined });
  };

  const toggleGroup = (groupId: string) => {
    const current = filters.groups ?? [];
    const next = current.includes(groupId) ? current.filter((g) => g !== groupId) : [...current, groupId];
    applyPatch({ groups: next.length ? next : undefined });
  };

  const setTuition = (range?: TuitionRange) => {
    applyPatch({ tuition: filters.tuition === range ? undefined : range });
    setActiveDropdown(null);
  };

  // Nhãn hiển thị trên từng nút filter
  const regionLabel =
    (filters.regions?.length ?? 0) === 0
      ? "Khu vực"
      : filters.regions!.length === 1
        ? REGION_LABELS[filters.regions![0]]
        : `${filters.regions!.length} khu vực`;

  const typeLabel =
    (filters.types?.length ?? 0) === 0
      ? "Loại trường"
      : filters.types!.length === 1
        ? SCHOOL_TYPE_LABELS[filters.types![0]]
        : `${filters.types!.length} loại trường`;

  const groupLabel =
    (filters.groups?.length ?? 0) === 0
      ? "Nhóm ngành"
      : filters.groups!.length === 1
        ? groups.find((g) => g.id === filters.groups![0])?.name || "1 ngành"
        : `${filters.groups!.length} nhóm ngành`;

  const tuitionLabel = filters.tuition ? TUITION_RANGES[filters.tuition].label : "Học phí";

  const hasAnyFilter =
    Boolean(filters.q) ||
    Boolean(filters.regions?.length) ||
    Boolean(filters.types?.length) ||
    Boolean(filters.groups?.length) ||
    Boolean(filters.tuition);

  return (
    <section className="relative isolate z-10 mt-2 overflow-visible rounded-[28px] sm:rounded-[36px] border-4 border-slate-300 bg-[#29374f] text-white shadow-[8px_8px_0px_#cbd5e1] sm:shadow-[12px_12px_0px_#cbd5e1]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {/* ẢNH MINH HOẠ KHUÔN VIÊN ĐẠI HỌC HOẠT HÌNH PIXEL ART 16-BIT */}
        <Image
          src="/images/schools/hero-pixel-campus.webp"
          alt="Khuôn viên học viện đại học phong cách hoạt hình pixel retro RPG ấm áp, tráng lệ"
          fill
          priority
          sizes="(max-width: 1440px) 100vw, 1440px"
          className="object-cover object-[75%_center] lg:object-[68%_42%] brightness-110 saturate-75 transition-all duration-700"
        />

        {/* LỚP PHỦ GRADIENT CHIẾN THUẬT: Giữ chữ siêu nét bên trái, toả sáng toà lâu đài pixel bên phải */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[#29374f] via-[#29374f]/90 to-transparent lg:w-[62%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#364861]/65 via-slate-200/10 to-slate-300/15"
        />

        {/* HIỆU ỨNG PIXEL GRID SCANLINE RETRO TINH TẾ */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]"
        />

        {/* CÁC NGÔI SAO PIXEL 8-BIT (✦) TOẢ SÁNG TRÊN BẦU TRỜI HOẠT HÌNH */}
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
          {/* Ngôi sao Pixel Vàng Hoàng Gia 1 */}
          <div className="absolute top-8 right-[33%] hidden lg:block animate-pulse duration-1000">
            <PixelStar className="size-6 text-amber-300 drop-shadow-[0_0_10px_#f59e0b]" />
          </div>
          {/* Ngôi sao Pixel Xanh Ngọc 2 */}
          <div className="absolute top-16 right-[18%] hidden lg:block animate-pulse duration-700 delay-300">
            <PixelStar className="size-5 text-cyan-300 drop-shadow-[0_0_8px_#06b6d4]" />
          </div>
          {/* Ngôi sao Pixel Hồng Anh Đào 3 */}
          <div className="absolute top-28 right-[42%] hidden lg:block animate-pulse duration-1000 delay-500">
            <PixelSparkle className="size-4 text-pink-300 drop-shadow-[0_0_8px_#f472b6]" />
          </div>
          {/* Ngôi sao Pixel Bạc 4 */}
          <div className="absolute top-36 right-[24%] hidden lg:block animate-pulse duration-1000 delay-700">
            <PixelSparkle className="size-3 text-white drop-shadow-[0_0_6px_#ffffff]" />
          </div>
          {/* Ngôi sao Pixel Vàng 5 gần lâu đài */}
          <div className="absolute bottom-24 right-[40%] hidden lg:block animate-pulse duration-1000 delay-200">
            <PixelStar className="size-4 text-amber-400 drop-shadow-[0_0_8px_#fbbf24]" />
          </div>
        </div>

      </div>

      {/* NỘI DUNG CHÍNH: KHUNG RỘNG RÃI, THOÁNG ĐẠT VỚI CẢM HỨNG RETRO ACADEMY */}
      <div className="relative z-10 grid min-h-[500px] grid-cols-1 items-center gap-8 p-6 sm:p-9 md:p-11 lg:min-h-[550px] lg:grid-cols-12 lg:gap-10 lg:p-14">
        {/* CỘT TRÁI: Heading & Bàn điều khiển tìm kiếm phong cách Arcade / Retro Console (7 Cột) */}
        <div className="flex flex-col justify-center lg:col-span-7">
          {/* Heading nghệ thuật với typography ấn tượng và độ tương phản cao */}
          <h1 className="font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-[54px] xl:text-[58px]">
            Tìm trường <br />
            <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-cyan-100 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.15)]">
              theo tiêu chí của bạn.
            </span>
          </h1>

          {/* SEARCH CONSOLE CONTAINER - PHONG CÁCH BÀN PHÍM ARCADE / GAME RETRO */}
          <div className="mt-6" ref={dropdownRef}>
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="relative flex items-center rounded-2xl border-3 border-slate-300 bg-white p-2 pl-4 sm:pl-5 shadow-[5px_5px_0px_#94a3b8] transition-all focus-within:ring-4 focus-within:ring-primary-200/60"
            >
              <LuSearch className="size-5 shrink-0 text-slate-600" aria-hidden />
              <input
                type="text"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tên hoặc mã trường, VD: Bách khoa, KHA, Kinh tế…"
                className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:outline-none"
              />

              {query && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Xoá từ khoá"
                  className="mr-1.5 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-800"
                >
                  <LuX className="size-4" />
                </button>
              )}

              {/* Nút bấm hành động phong cách Game Pad 3D nảy khối */}
              <button
                type="submit"
                disabled={pending}
                className="shrink-0 rounded-xl border-2 border-amber-300 bg-amber-200 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-black tracking-wide text-slate-950 shadow-[3px_3px_0px_#d4a94e] transition-all hover:bg-amber-300 hover:shadow-[4px_4px_0px_#d4a94e] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <span className="inline-flex items-center gap-2">
                  <PixelStar className="size-3.5 text-slate-950" />
                  <span>{pending ? "Đang quét…" : "Tìm trường"}</span>
                </span>
              </button>
            </form>

            {/* CÁC NÚT LỌC NHANH (INVENTORY BUFF PILLS) CHUẨN NÉO-BRUTALIST PIXEL */}
            <div className="relative mt-4 flex flex-wrap items-center gap-2.5">
              {/* 1. Filter Khu vực */}
              <div className="static md:relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown((prev) => (prev === "region" ? null : "region"))}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all border-2 border-slate-300 shadow-[3px_3px_0px_#94a3b8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                    filters.regions?.length
                      ? "bg-amber-100 text-slate-900"
                      : "bg-white/90 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <LuMapPin className="size-3.5" />
                  <span>{regionLabel}</span>
                  <LuChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      activeDropdown === "region" && "rotate-180"
                    )}
                  />
                </button>

                {activeDropdown === "region" && (
                  <div className="absolute top-full left-0 z-50 mt-2.5 w-52 max-w-full md:max-w-none animate-in fade-in zoom-in-95 rounded-2xl border-3 border-slate-300 bg-paper-50 p-2 text-slate-800 shadow-[6px_6px_0px_#cbd5e1] duration-150">
                    <p className="px-3 py-1.5 text-[11px] font-black tracking-wider text-primary-700 uppercase">
                      ✦ Khu vực trường
                    </p>
                    {(Object.keys(REGION_LABELS) as Region[]).map((reg) => {
                      const isSelected = filters.regions?.includes(reg);
                      return (
                        <button
                          key={reg}
                          type="button"
                          onClick={() => toggleRegion(reg)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-colors",
                            isSelected
                              ? "bg-amber-100 text-slate-900 font-black"
                              : "text-slate-700 hover:bg-primary-50 hover:text-primary-800"
                          )}
                        >
                          <span>{REGION_LABELS[reg]}</span>
                          {isSelected && <LuCheck className="size-4 shrink-0 text-slate-950" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Filter Loại trường */}
              <div className="static md:relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown((prev) => (prev === "type" ? null : "type"))}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all border-2 border-slate-300 shadow-[3px_3px_0px_#94a3b8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                    filters.types?.length
                      ? "bg-amber-100 text-slate-900"
                      : "bg-white/90 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <LuGraduationCap className="size-3.5" />
                  <span>{typeLabel}</span>
                  <LuChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      activeDropdown === "type" && "rotate-180"
                    )}
                  />
                </button>

                {activeDropdown === "type" && (
                  <div className="absolute top-full left-0 z-50 mt-2.5 w-52 max-w-full md:max-w-none animate-in fade-in zoom-in-95 rounded-2xl border-3 border-slate-300 bg-paper-50 p-2 text-slate-800 shadow-[6px_6px_0px_#cbd5e1] duration-150">
                    <p className="px-3 py-1.5 text-[11px] font-black tracking-wider text-primary-700 uppercase">
                      ✦ Mô hình đào tạo
                    </p>
                    {(Object.keys(SCHOOL_TYPE_LABELS) as SchoolType[]).map((t) => {
                      const isSelected = filters.types?.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleType(t)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-colors",
                            isSelected
                              ? "bg-amber-100 text-slate-900 font-black"
                              : "text-slate-700 hover:bg-primary-50 hover:text-primary-800"
                          )}
                        >
                          <span>{SCHOOL_TYPE_LABELS[t]}</span>
                          {isSelected && <LuCheck className="size-4 shrink-0 text-slate-950" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Filter Nhóm ngành */}
              <div className="static md:relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown((prev) => (prev === "group" ? null : "group"))}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all border-2 border-slate-300 shadow-[3px_3px_0px_#94a3b8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                    filters.groups?.length
                      ? "bg-amber-100 text-slate-900"
                      : "bg-white/90 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <LuBuilding2 className="size-3.5" />
                  <span>{groupLabel}</span>
                  <LuChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      activeDropdown === "group" && "rotate-180"
                    )}
                  />
                </button>

                {activeDropdown === "group" && (
                  <div className="absolute top-full left-0 z-50 mt-2.5 w-72 max-w-full md:max-w-none animate-in fade-in zoom-in-95 rounded-2xl border-3 border-slate-300 bg-paper-50 p-2 text-slate-800 shadow-[6px_6px_0px_#cbd5e1] duration-150">
                    <p className="px-3 py-1.5 text-[11px] font-black tracking-wider text-primary-700 uppercase">
                      ✦ Nhóm ngành đào tạo
                    </p>
                    {groups.map((g) => {
                      const isSelected = filters.groups?.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGroup(g.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-colors",
                            isSelected
                              ? "bg-amber-100 text-slate-900 font-black"
                              : "text-slate-700 hover:bg-primary-50 hover:text-primary-800"
                          )}
                        >
                          <span>{g.name}</span>
                          {isSelected && <LuCheck className="size-4 shrink-0 text-slate-950" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Filter Học phí */}
              <div className="static md:relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown((prev) => (prev === "tuition" ? null : "tuition"))}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all border-2 border-slate-300 shadow-[3px_3px_0px_#94a3b8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                    filters.tuition
                      ? "bg-amber-100 text-slate-900"
                      : "bg-white/90 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <LuCoins className="size-3.5" />
                  <span>{tuitionLabel}</span>
                  <LuChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      activeDropdown === "tuition" && "rotate-180"
                    )}
                  />
                </button>

                {activeDropdown === "tuition" && (
                  <div className="absolute top-full left-0 z-50 mt-2.5 w-56 max-w-full md:right-0 md:left-auto md:max-w-none animate-in fade-in zoom-in-95 rounded-2xl border-3 border-slate-300 bg-paper-50 p-2 text-slate-800 shadow-[6px_6px_0px_#cbd5e1] duration-150">
                    <p className="px-3 py-1.5 text-[11px] font-black tracking-wider text-primary-700 uppercase">
                      ✦ Mức học phí / năm
                    </p>
                    <button
                      type="button"
                      onClick={() => setTuition(undefined)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-colors",
                        !filters.tuition ? "bg-amber-100 text-slate-900 font-black" : "text-slate-700 hover:bg-primary-50"
                      )}
                    >
                      <span>Tất cả mức học phí</span>
                      {!filters.tuition && <LuCheck className="size-4 text-slate-950" />}
                    </button>
                    {(Object.keys(TUITION_RANGES) as TuitionRange[]).map((r) => {
                      const isSelected = filters.tuition === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setTuition(r)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-semibold transition-colors",
                            isSelected
                              ? "bg-amber-100 text-slate-900 font-black"
                              : "text-slate-700 hover:bg-primary-50 hover:text-primary-800"
                          )}
                        >
                          <span>{TUITION_RANGES[r].label}</span>
                          {isSelected && <LuCheck className="size-4 shrink-0 text-slate-950" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Nút Đặt lại bộ lọc */}
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    applyPatch({
                      q: undefined,
                      regions: undefined,
                      types: undefined,
                      groups: undefined,
                      tuition: undefined,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-rose-200 bg-rose-100 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-[3px_3px_0px_#fda4af] transition-colors hover:bg-rose-200 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  <LuRotateCcw className="size-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
