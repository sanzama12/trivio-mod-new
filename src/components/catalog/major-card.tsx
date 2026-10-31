"use client";

import Link from "next/link";
import { LuArrowRight, LuGraduationCap, LuHeart } from "react-icons/lu";
import type { MajorListItem } from "@/services/catalog.service";
import { useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function MajorCard({ item }: { item: MajorListItem }) {
  const { major, group, schoolCount, programCount } = item;
  const { isInterestedMajor, toggleInterestedMajor, hydrated } = useTrovio();
  const toast = useToast();
  const saved = hydrated && isInterestedMajor(major.id);

  const handleToggleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleInterestedMajor(major.id);
    toast(added ? `Đã thêm ${major.name} vào ngành quan tâm` : `Đã bỏ ${major.name} khỏi ngành quan tâm`, "success");
  };

  const countDisplay = schoolCount > 0 ? schoolCount : programCount > 0 ? programCount : 12;

  return (
    <article className="group relative flex flex-col rounded-2xl border border-[#EDE8DF] bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Hàng 1: Icon mũ cử nhân + Tên ngành + Nút tim yêu thích */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-[#FAF5EB] text-[#B58A3C] shadow-xs">
            <LuGraduationCap className="size-5 sm:size-6" aria-hidden />
          </div>
          <Link
            href={`/nganh/${major.slug}`}
            className="text-lg sm:text-xl font-bold tracking-tight text-[#00629B] hover:text-[#004873] hover:underline transition-colors line-clamp-1"
          >
            {major.name}
          </Link>
        </div>

        <button
          type="button"
          onClick={handleToggleHeart}
          aria-label={saved ? "Bỏ lưu ngành học" : "Lưu ngành học"}
          title={saved ? "Bỏ lưu ngành" : "Lưu vào danh sách"}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer",
            saved
              ? "border-rose-200 bg-rose-50 text-rose-500 shadow-xs"
              : "border-stone-200 text-stone-400 hover:border-stone-300 hover:bg-stone-50 hover:text-rose-500"
          )}
        >
          <LuHeart className={cn("size-4.5 transition-transform", saved && "fill-current scale-110")} aria-hidden />
        </button>
      </div>

      {/* Hàng 2: Thẻ nhóm ngành • Tên nhánh/mã • Số trường đào tạo */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] sm:text-[13.5px] text-stone-600">
        <span>{group.name}</span>
        <span className="text-stone-300" aria-hidden>•</span>
        <span>{major.name}</span>
        <span className="text-stone-300" aria-hidden>•</span>
        <span>{countDisplay} trường đào tạo</span>
      </div>

      {/* Hàng 3: Tổng quan về ngành */}
      <p className="mt-3 text-sm sm:text-[14.5px] leading-relaxed text-stone-600 line-clamp-3 sm:line-clamp-2">
        <span className="font-semibold text-stone-800">Tổng quan về ngành </span>
        {major.summary || major.description || "Tìm hiểu khung kiến thức đào tạo, cơ hội nghề nghiệp và danh sách các trường tuyển sinh."}
      </p>

      {/* Hàng 4: Link Xem ngành -> */}
      <div className="mt-4 flex justify-end border-t border-stone-100 pt-3">
        <Link
          href={`/nganh/${major.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00629B] hover:text-[#004873] hover:gap-2 transition-all"
        >
          <span>Xem ngành</span>
          <LuArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
