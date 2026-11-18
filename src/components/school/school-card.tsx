"use client";

import { buttonClass } from "@/components/ui/button";
import Link from "next/link";
import { LuArrowUpRight, LuHeart, LuMapPin, LuScale } from "react-icons/lu";
import type { School } from "@/domain/types";
import type { SchoolSearchSummary } from "@/models/dtos";
import { formatTuition } from "@/lib/format";
import { ADMISSION_METHODS, formatMethodScore } from "@/services/scoring.service";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { SchoolLogo } from "./school-logo";
import { useTrovio } from "@/stores/trovio-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

export function SchoolCard({ school, summary, filtered = false }: { school: School; summary?: SchoolSearchSummary; filtered?: boolean }) {
  const schoolType = SCHOOL_TYPE_LABELS[school.type] || "Công lập";
  const { isSaved, toggleSaved, inCompare, toggleCompare, hydrated } = useTrovio();
  const toast = useToast();
  const saved = hydrated && isSaved(`school:${school.id}`);
  const comparing = hydrated && inCompare(school.id);

  const handleCompare = () => {
    const result = toggleCompare(school.id);
    if (result === "added") toast(`Đã thêm ${school.shortName || school.name} vào danh sách so sánh`, "success");
    else if (result === "removed") toast(`Đã bỏ ${school.shortName || school.name} khỏi so sánh`, "info");
    else if (result === "full") toast("Đã chọn tối đa 4 trường để so sánh.", "warning");
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary-300 hover:shadow-md">
      <div className="flex items-start gap-4 p-5 sm:gap-6 sm:p-6">
        <Link href={`/truong/${school.slug}`} aria-label={`Xem trường ${school.name}`} className="shrink-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-primary-600">
          <SchoolLogo school={school} size="lg" className="size-16 sm:size-24" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary-700">{schoolType} · {school.code}</p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
            <Link href={`/truong/${school.slug}`} className="hover:text-primary-700 hover:underline">{school.name}</Link>
          </h2>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 sm:text-sm">
            <LuMapPin className="size-4 shrink-0" aria-hidden />{school.city || REGION_LABELS[school.region]}
          </p>
          <p className="mt-3 hidden text-sm leading-6 text-slate-600 sm:line-clamp-2">
            {school.highlight || school.description || "Tìm hiểu giới thiệu, thông tin cơ sở và các ngành đào tạo của trường."}
          </p>
        </div>
        <button type="button" aria-label={saved ? `Bỏ lưu ${school.name}` : `Lưu ${school.name}`}
          onClick={() => {
            const added = toggleSaved(`school:${school.id}`);
            toast(added ? `Đã lưu ${school.name}` : `Đã bỏ lưu ${school.name}`, "success");
          }}
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
            saved ? "border-rose-200 bg-rose-50 text-rose-500" : "border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500")}>
          <LuHeart className={cn("size-4", saved && "fill-current")} aria-hidden />
        </button>
      </div>
      {summary && (
        <div className="mx-5 mb-5 rounded-xl bg-slate-50 p-4 sm:mx-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">{filtered ? "Chương trình khớp bộ lọc" : "Chương trình đào tạo"}</dt>
              <dd className="mt-1 font-semibold text-slate-900">{summary.programCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Học phí</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {summary.tuitionMin != null && summary.tuitionMax != null
                  ? formatTuition(summary.tuitionMin, summary.tuitionMax)
                  : "Chưa có dữ liệu"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Điểm chuẩn ({ADMISSION_METHODS[summary.method].short})</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {summary.cutoffMin == null
                  ? "Chưa có dữ liệu"
                  : summary.cutoffMin === summary.cutoffMax
                    ? formatMethodScore(summary.cutoffMin, summary.method)
                    : `${formatMethodScore(summary.cutoffMin, summary.method)} – ${formatMethodScore(summary.cutoffMax, summary.method)}`}
              </dd>
            </div>
          </dl>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:px-6">
        <button type="button" onClick={handleCompare}
          className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
            comparing ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
          <LuScale className="size-4" aria-hidden />{comparing ? "Đang so sánh" : "Thêm so sánh"}
        </button>
        <Link href={`/truong/${school.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-800 sm:text-sm">
          Xem chi tiết trường<LuArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
