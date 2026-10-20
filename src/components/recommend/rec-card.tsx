"use client";

import Link from "next/link";
import { LuArrowRight, LuCircleAlert, LuLightbulb, LuWallet } from "react-icons/lu";
import type { Recommendation } from "@/services/recommendation.service";
import { ADMISSION_METHODS, cutoffFor, formatMethodScore } from "@/services/scoring.service";
import { formatTuition } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { FitBadge, FitGapBadge } from "@/components/program/fit-badge";
import { SchoolCode } from "@/components/program/program-card";
import { SaveButton } from "@/components/program/program-actions";
import { GoalMatchChip } from "./goal-chip";

/**
 * Thẻ gợi ý chỉ giữ thông tin cần để quét nhanh. Các phương thức xét tuyển,
 * tiêu chí và giải thích chi tiết nằm trong ngăn "Vì sao phù hợp?".
 */
export function RecCard({
  rec,
  goalName,
  budgetMax,
  userScore = null,
  onWhy,
  showReasons = true,
}: {
  rec: Recommendation;
  goalName: string | null;
  budgetMax?: number | null;
  userScore?: number | null;
  onWhy: () => void;
  showReasons?: boolean;
}) {
  const { view: v } = rec;
  const method = v.cutoffMethod ?? "thpt";
  const cutoff = v.latestCutoff;
  const cutoffYear = cutoffFor(v.program, method)?.year;
  const overBudget = budgetMax != null && v.program.tuitionMax > budgetMax;
  const alert =
    rec.warning != null
      ? rec.warning
      : v.fit?.level === "thu-suc"
        ? "Nên xếp sau ít nhất một nguyện vọng An toàn."
        : overBudget
          ? `Học phí cao hơn ngân sách ${budgetMax} triệu/năm của bạn.`
          : null;

  return (
    <Card className={cn("flex h-full min-w-0 flex-col overflow-hidden rounded-2xl p-0 transition-all hover:-translate-y-0.5 hover:shadow-elevated", rec.goalMatch === "match" && "border-primary-300 ring-1 ring-primary-200")}>
      <span aria-hidden className={cn("h-1 w-full bg-accent-500", rec.goalMatch === "match" && "bg-primary-600")} />
      <div className="flex items-start gap-3 px-5 pt-4">
        <SchoolCode code={v.school.code} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold tracking-wider text-primary-600 uppercase">{v.school.name}</p>
          <Link href={`/chuong-trinh/${v.program.slug}`} className="mt-0.5 line-clamp-2 text-left text-[17px] leading-snug font-black break-words text-slate-900 hover:text-primary-700">
            {v.program.name}
          </Link>
        </div>
        <SaveButton id={v.program.id} />
      </div>

      <div className="px-5 pt-4">
        <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70 min-[420px]:grid-cols-2 min-[420px]:divide-x min-[420px]:divide-y-0">
          <div className="min-w-0 px-3.5 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Mức phù hợp</p>
            <p className="mt-0.5 text-xl font-extrabold text-primary-700 tabular-nums">
              {rec.score}<span className="ml-0.5 text-xs font-semibold text-primary-500">/100</span>
            </p>
            <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-primary-600" style={{ width: `${Math.max(0, Math.min(100, rec.score))}%` }} />
            </span>
          </div>
          <div className="min-w-0 px-3.5 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Điểm chuẩn gần nhất</p>
            {cutoff != null ? (
              <>
                <p className="mt-0.5 truncate text-xl font-extrabold text-slate-900 tabular-nums">{formatMethodScore(cutoff, method)}</p>
                <p className="truncate text-[11px] font-medium text-slate-500">
                  {ADMISSION_METHODS[method].short}{cutoffYear ? ` · ${cutoffYear}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-slate-600">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <LuWallet className="size-3.5 shrink-0 text-slate-500" aria-hidden />
            <span className="truncate">{formatTuition(v.program.tuitionMin, v.program.tuitionMax)}</span>
          </span>
          {rec.fitGap ? <FitGapBadge reason={rec.fitGap} /> : <FitBadge fit={v.fit} />}
        </div>

        {goalName && rec.goalMatch ? <GoalMatchChip match={rec.goalMatch} goalName={goalName} className="mt-2 max-w-full" /> : null}

        {showReasons && alert ? (
          <p className="mt-3 flex gap-2 rounded-xl border border-accent-200/70 bg-accent-50 px-3 py-2 text-xs leading-relaxed text-accent-700">
            <LuCircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2 min-w-0">{alert}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-auto grid grid-cols-1 gap-2 border-t border-slate-100 px-4 py-3 min-[420px]:grid-cols-2">
        <button type="button" onClick={onWhy} className={buttonClass({ variant: "ghost", size: "sm", full: true, className: "px-2" })}>
          <LuLightbulb className="size-4" aria-hidden /> Vì sao phù hợp?
        </button>
        <Link href={`/chuong-trinh/${v.program.slug}`} className={buttonClass({ size: "sm", full: true, className: "px-2" })}>
          Xem chi tiết <LuArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
