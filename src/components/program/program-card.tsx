import Link from "next/link";
import {
  LuArrowUpRight,
  LuBookOpen,
  LuCoins,
  LuGraduationCap,
  LuHistory,
  LuTrendingUp,
} from "react-icons/lu";
import type { ProgramView } from "@/services/program.service";
import { formatTuition } from "@/lib/format";
import { ADMISSION_METHODS, formatMethodScore } from "@/services/scoring.service";
import { REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/services/program.filters";
import { CompareButton, SaveButton } from "./program-actions";
import { FitBadge } from "./fit-badge";
import { SchoolLogo } from "@/components/school/school-logo";
import { cn } from "@/lib/cn";

export function SchoolCode({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  return (
    <span
      className={
        size === "lg"
          ? "flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-primary-700 shadow-sm"
          : "flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-[13px] font-extrabold text-primary-700"
      }
    >
      {code}
    </span>
  );
}

export function ProgramCard({ view }: { view: ProgramView }) {
  const { program, school, latestCutoff, fit, cutoffMethod = "thpt" } = view;
  const methodTag = cutoffMethod !== "thpt" ? ` ${ADMISSION_METHODS[cutoffMethod].short}` : "";
  const schoolType = SCHOOL_TYPE_LABELS[school.type] || "Công lập";

  return (
    <div className="group relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md sm:p-6">
      {/* 1. Hàng tiêu đề trên cùng (Logo, Tên trường & Ngành, Mũi tên ↗) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
          <SchoolLogo school={school} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-primary-800 md:text-xl">
                <Link href={`/chuong-trinh/${program.slug}`} className="hover:underline">
                  {school.name}
                </Link>
              </h3>
            </div>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              <Link href={`/chuong-trinh/${program.slug}`} className="hover:text-primary-700 hover:underline">
                {program.name}
              </Link>
              {program.trainingType && program.trainingType !== "Chính quy" && (
                <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {program.trainingType}
                </span>
              )}
            </p>

            {school.highlight ? (
              <p className="mt-0.5 text-xs text-slate-500">
                Thế mạnh: {school.highlight}
              </p>
            ) : null}

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {school.city || "Toàn quốc"} · {schoolType}
            </p>
          </div>
        </div>

        {/* Nút mũi tên mở chi tiết ↗ */}
        <Link
          href={`/chuong-trinh/${program.slug}`}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary-700"
          title="Xem chi tiết"
          aria-label={`Xem chi tiết ${program.name}`}
        >
          <LuArrowUpRight className="size-5" aria-hidden />
        </Link>
      </div>

      {/* 2. Khối thông số ở giữa: thiết kế rộng chia cột có vạch ngăn cách */}
      <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-[#fafaf7] p-4 sm:grid-cols-2 md:grid-cols-[130px_1px_1fr_1fr] md:items-center md:gap-5">
        {/* Cột 1: Khu vực & Loại hình */}
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Khu vực</p>
            <p className="text-sm font-bold text-slate-900 md:text-base">
              {school.city || "Toàn quốc"}
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
              <p className="text-sm font-bold text-slate-900 truncate" title={program.name}>
                {program.name}
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
                {formatTuition(program.tuitionMin, program.tuitionMax)}
              </p>
            </div>
          </div>
        </div>

        {/* Cột 3: Điểm THPT & Tổ hợp / Ngành nổi bật */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <LuTrendingUp className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Điểm 2026 THPT</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {latestCutoff != null ? (
                  <span className="text-primary-700 font-extrabold">{formatMethodScore(latestCutoff, cutoffMethod)} điểm{methodTag}</span>
                ) : (
                  <span className="text-slate-400 font-normal">Chưa có</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <LuBookOpen className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Tổ hợp môn</p>
              <p className="text-sm font-bold text-slate-900 truncate" title={program.combos.join(", ")}>
                {program.combos.length > 0 ? program.combos.join(", ") : "Theo đề án"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5. Điểm chuẩn các năm trước & Đối chiếu điểm dự kiến */}
      {program.cutoffs && program.cutoffs.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50/80 px-3.5 py-2.5 text-xs border border-slate-200/60">
          <span className="flex items-center gap-1 font-semibold text-slate-600">
            <LuHistory className="size-3.5 text-slate-400" />
            Điểm chuẩn lịch sử:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {program.cutoffs.map((c) => {
              const userScore = fit && latestCutoff != null ? Math.round((latestCutoff + fit.diff) * 100) / 100 : null;
              const diff = userScore != null ? Math.round((userScore - c.score) * 100) / 100 : null;
              return (
                <span
                  key={c.year}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 border border-slate-200 text-slate-700 shadow-2xs font-medium"
                >
                  <span className="text-slate-500">{c.year}:</span>
                  <span className="font-bold text-slate-900">{c.score.toFixed(2)}</span>
                  {diff != null && (
                    <span
                      title={`Điểm dự kiến chênh ${diff >= 0 ? "+" : ""}${diff.toFixed(2)} so với năm ${c.year}`}
                      className={cn(
                        "text-[11px] font-bold",
                        diff >= 0 ? "text-emerald-700" : "text-amber-700"
                      )}
                    >
                      ({diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)})
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Chân thẻ (Thanh nút thao tác dưới đáy: So sánh & Yêu thích) */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
        <div className="flex items-center gap-2.5">
          <CompareButton id={program.id} variant="pill" />
          {fit && <FitBadge fit={fit} />}
        </div>
        <div className="flex items-center gap-3">
          <SaveButton id={program.id} variant="text" />
        </div>
      </div>
    </div>
  );
}
