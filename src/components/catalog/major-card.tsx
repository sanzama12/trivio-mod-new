"use client";

import Link from "next/link";
import { LuArrowRight, LuGraduationCap, LuHeart } from "react-icons/lu";
import type { MajorListItem } from "@/services/catalog.service";
import { useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function MajorCard({ item }: { item: MajorListItem }) {
  const { major, group } = item;
  const { isInterestedMajor, toggleInterestedMajor, hydrated } = useTrovio();
  const toast = useToast();
  const saved = hydrated && isInterestedMajor(major.id);

  const handleToggleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleInterestedMajor(major.id);
    toast(added ? `Đã thêm ${major.name} vào ngành quan tâm` : `Đã bỏ ${major.name} khỏi ngành quan tâm`, "success");
  };

  return (
    <article className="group relative flex flex-col rounded-[1.8rem] border border-dashed border-slate-400 bg-[#fbfdf8] p-5 transition-all duration-200 hover:border-primary-600 hover:shadow-lg sm:p-6">
      {/* Hàng 1: Icon mũ cử nhân + Tên ngành + Nút tim yêu thích */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm ring-1 ring-primary-100 transition-transform group-hover:scale-105">
            <LuGraduationCap className="size-5 sm:size-6" aria-hidden />
          </div>
          <Link
            href={`/nganh/${major.slug}`}
            className="line-clamp-1 text-lg font-bold tracking-tight text-slate-900 transition-colors hover:text-primary-700 hover:underline sm:text-xl"
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
            "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
            saved
              ? "border-rose-200 bg-rose-50 text-rose-500 shadow-xs"
              : "border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
          )}
        >
          <LuHeart className={cn("size-4.5 transition-transform", saved && "fill-current scale-110")} aria-hidden />
        </button>
      </div>

      {/* Hàng 2: Thẻ nhóm ngành • Mã ngành • Số trường đào tạo */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-600">
        <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-bold text-primary-800">{group.name}</span>
        {major.code ? (
          <>
            <span className="text-slate-300" aria-hidden>•</span>
            <span className="font-mono text-xs text-slate-500">Mã {major.code}</span>
          </>
        ) : null}
      </div>

      {/* Hàng 3: Tổng quan về ngành */}
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 sm:line-clamp-2">
        <span className="font-semibold text-slate-800">Tổng quan: </span>
        {major.summary || major.description || "Tìm hiểu khung kiến thức đào tạo, cơ hội nghề nghiệp và danh sách các trường tuyển sinh."}
      </p>

      {/* Hàng 4: Link Xem ngành -> */}
      <div className="mt-4 flex items-center justify-end border-t border-slate-200/70 pt-3">
        <Link
          href={`/nganh/${major.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 transition-all hover:text-primary-900 hover:gap-2.5"
        >
          <span>Xem ngành</span>
          <LuArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
