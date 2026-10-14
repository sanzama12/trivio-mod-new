"use client";

import Link from "next/link";
import { LuArrowRight, LuCircleAlert, LuInfo, LuWallet } from "react-icons/lu";
import type { Recommendation } from "@/services/recommendation.service";
import { cutoffFor, formatMethodScore } from "@/services/scoring.service";
import { formatTuition } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { EstimatedTag } from "@/components/ui/estimated-tag";
import { FitBadge, FitGapBadge } from "@/components/program/fit-badge";
import { SchoolCode } from "@/components/program/program-card";
import { SaveButton } from "@/components/program/program-actions";
import { GoalMatchChip } from "./goal-chip";
import { StyleLine } from "@/components/work-style/style-bits";

/** Thẻ một gợi ý: chip mục tiêu, mức khả năng (hoặc "Chưa đủ dữ liệu"), cảnh báo, lý do, nút "Vì sao gợi ý?". */
export function RecCard({
  rec,
  goalName,
  budgetMax,
  onWhy,
  showReasons = true,
}: {
  rec: Recommendation;
  goalName: string | null;
  budgetMax?: number | null;
  onWhy: () => void;
  showReasons?: boolean;
}) {
  const { view: v } = rec;
  const overBudget = budgetMax != null && v.program.tuitionMax > budgetMax;
  const alert =
    rec.warning != null
      ? { tone: "accent", text: rec.warning, Icon: LuCircleAlert }
      : rec.fitGap === "few-years"
        ? { tone: "slate", text: `Mới có ${rec.history.length} năm điểm chuẩn — Trovio chỉ gắn nhãn An toàn / Vừa sức / Thử sức khi có đủ 3 năm.`, Icon: LuInfo }
        : v.fit?.level === "thu-suc"
          ? {
              tone: "accent",
              text: `Chuẩn ${cutoffFor(v.program, v.cutoffMethod)?.year ?? ""} cao hơn điểm của bạn ${formatMethodScore(Math.abs(v.fit.diff), v.cutoffMethod)} điểm. Nên xếp sau ít nhất một nguyện vọng An toàn.`,
              Icon: LuCircleAlert,
            }
          : overBudget
            ? { tone: "danger", text: `Học phí có thể lên tới ${v.program.tuitionMax} triệu/năm, cao hơn ngân sách ${budgetMax} triệu bạn đặt.`, Icon: LuWallet }
            : null;
  return (
    <Card className={cn("flex h-full flex-col gap-3 p-5", rec.goalMatch === "match" && "border-primary-200")}>
      {goalName && rec.goalMatch && <GoalMatchChip match={rec.goalMatch} goalName={goalName} className="self-start" />}
      <div className="flex gap-3">
        <SchoolCode code={v.school.code} />
        <div className="min-w-0 flex-1">
          <Link href={`/chuong-trinh/${v.program.slug}`} className="font-bold text-slate-900 hover:text-primary-700">
            {v.program.name}
          </Link>
          <p className="truncate text-[13px] text-primary-600">{v.school.name}</p>
        </div>
        <SaveButton id={v.program.id} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {v.latestCutoff != null && (
          <span className="rounded-md bg-primary-50 px-2 py-1 font-semibold text-primary-700">{formatMethodScore(v.latestCutoff, v.cutoffMethod)} điểm</span>
        )}
        {v.latestCutoff != null && v.cutoffEstimated && <EstimatedTag />}
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{formatTuition(v.program.tuitionMin, v.program.tuitionMax)}</span>
        {rec.fitGap ? <FitGapBadge reason={rec.fitGap} /> : <FitBadge fit={v.fit} />}
      </div>
      {alert && (
        <p
          className={cn(
            "flex gap-2 rounded-lg border px-3 py-2 text-xs",
            alert.tone === "accent" && "border-accent-200 bg-accent-50 text-accent-700",
            alert.tone === "danger" && "border-danger-100 bg-danger-50 text-danger-700",
            alert.tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          <alert.Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {alert.text}
        </p>
      )}
      {showReasons && (
        <ul className="flex-1 space-y-1.5 border-t border-slate-100 pt-3">
          {rec.reasons.map((r) => (
            <li key={r} className="flex gap-2 text-[13px] text-slate-600">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      )}
      {showReasons && <StyleLine major={v.major} />}
      {!showReasons && <div className="flex-1" />}
      <div className="flex items-center justify-between gap-2">
        <Link href={`/chuong-trinh/${v.program.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
          Xem chi tiết <LuArrowRight className="size-4" aria-hidden />
        </Link>
        <button type="button" onClick={onWhy} className="rounded-md px-1.5 py-1 text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-primary-700">
          Vì sao gợi ý?
        </button>
      </div>
    </Card>
  );
}
