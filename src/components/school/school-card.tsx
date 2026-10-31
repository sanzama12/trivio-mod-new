"use client";

import Link from "next/link";
import {
  LuArrowUpRight,
  LuBookOpen,
  LuCoins,
  LuGraduationCap,
  LuHeart,
  LuScale,
  LuTrendingUp,
} from "react-icons/lu";
import type { School } from "@/domain/types";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { SchoolLogo } from "./school-logo";
import { useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function SchoolCard({
  school,
  programCount,
  tuitionRange,
  cutoffRange,
  featuredMajor,
}: {
  school: School;
  programCount?: number;
  tuitionRange?: string;
  cutoffRange?: string;
  featuredMajor?: string;
}) {
  const schoolType = SCHOOL_TYPE_LABELS[school.type] || "Công lập";
  const regionLabel = REGION_LABELS[school.region] || "Toàn quốc";

  const { isSaved, toggleSaved, inCompare, toggleCompare, hydrated } = useTrovio();
  const toast = useToast();

  const isSchoolSaved = hydrated && isSaved(`school:${school.id}`);
  const inCompareList = hydrated && inCompare(school.id);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleSaved(`school:${school.id}`);
    toast(added ? `Đã lưu ${school.name} vào danh sách yêu thích` : `Đã bỏ lưu ${school.name}`, "success");
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = toggleCompare(school.id);
    if (r === "added") toast(`Đã thêm ${school.shortName || school.name} vào danh sách so sánh`, "success");
    else if (r === "removed") toast(`Đã bỏ ${school.shortName || school.name} khỏi so sánh`, "info");
    else if (r === "full") toast("Đã chọn tối đa 4 trường để so sánh. Vui lòng bỏ bớt một trường để thêm mới.", "warning");
  };

  return (
    <div className="group relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md sm:p-6">
      {/* 1. Header (Logo, Tên trường, Nút lưu & Mũi tên ↗) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
          <SchoolLogo school={school} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-primary-800 md:text-xl">
              <Link href={`/truong/${school.slug}`} className="hover:underline">
                {school.name}
              </Link>
            </h3>

            {school.highlight ? (
              <p className="mt-1 text-sm text-slate-500">
                Thế mạnh: {school.highlight}
              </p>
            ) : null}

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {school.city || "Toàn quốc"} · {schoolType}
              {school.code ? ` · Mã: ${school.code}` : ""}
            </p>
          </div>
        </div>

        {/* Nút lưu tim & Mũi tên góc trên bên phải ↗ */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleSave}
            title={isSchoolSaved ? "Bỏ lưu trường yêu thích" : "Lưu trường yêu thích"}
            aria-label={isSchoolSaved ? "Bỏ lưu trường yêu thích" : "Lưu trường yêu thích"}
            className={cn(
              "flex size-9 items-center justify-center rounded-xl border transition-all cursor-pointer",
              isSchoolSaved
                ? "border-rose-200 bg-rose-50 text-rose-500 shadow-xs"
                : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-rose-500"
            )}
          >
            <LuHeart className={cn("size-4.5 transition-transform", isSchoolSaved && "fill-current scale-110")} aria-hidden />
          </button>
          <Link
            href={`/truong/${school.slug}`}
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary-700"
            title="Xem chi tiết trường"
            aria-label={`Xem chi tiết trường ${school.name}`}
          >
            <LuArrowUpRight className="size-4.5" aria-hidden />
          </Link>
        </div>
      </div>

      {/* 2. Khối thông số rộng nhiều cột */}
      <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-[#fafaf7] p-4 sm:grid-cols-2 md:grid-cols-[130px_1px_1fr_1fr] md:items-center md:gap-5">
        {/* Cột 1: Khu vực & Loại hình */}
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Khu vực</p>
            <p className="text-sm font-bold text-slate-900 md:text-base">
              {school.city || regionLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Loại hình</p>
            <p className="text-sm font-bold text-slate-900 md:text-base">
              {schoolType}
            </p>
          </div>
        </div>

        {/* Vạch kẻ dọc ngăn cách */}
        <div className="hidden h-14 w-px bg-slate-200 md:block" aria-hidden />

        {/* Cột 2: Ngành đào tạo & Học phí */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <LuGraduationCap className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Ngành đào tạo</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {programCount != null ? `${programCount} ngành` : "Đang cập nhật"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
              <LuCoins className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Học phí/năm</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {tuitionRange || "Theo đề án"}
              </p>
            </div>
          </div>
        </div>

        {/* Cột 3: Điểm THPT & Ngành nổi bật */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <LuTrendingUp className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Điểm 2026 THPT</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {cutoffRange ? (
                  <span className="text-primary-700 font-extrabold">{cutoffRange}</span>
                ) : (
                  <span className="text-slate-400 font-normal">Chưa công bố</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <LuBookOpen className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Ngành nổi bật</p>
              <p className="text-sm font-bold text-slate-900 truncate" title={featuredMajor || school.shortName}>
                {featuredMajor || "Đa dạng lựa chọn"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Chân thẻ: Các nút hành động */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCompare}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              inCompareList
                ? "border-primary-600 bg-primary-600 text-white shadow-xs"
                : "border-slate-300 bg-white text-slate-700 hover:border-primary-400 hover:bg-slate-50"
            )}
          >
            <LuScale className="size-3.5" aria-hidden />
            <span>{inCompareList ? "Đang so sánh" : "Thêm so sánh"}</span>
          </button>
          <Link
            href={`/chuong-trinh?q=${encodeURIComponent(school.code || school.name)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition-all hover:bg-teal-100 cursor-pointer"
          >
            <LuBookOpen className="size-3.5" aria-hidden />
            <span>Xem các ngành đào tạo</span>
          </Link>
        </div>
        <Link
          href={`/truong/${school.slug}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:bg-[#00629B]"
        >
          <span>Xem chi tiết trường</span>
          <LuArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
