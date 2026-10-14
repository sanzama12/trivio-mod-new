"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuAward, LuCalculator, LuCompass, LuTarget } from "react-icons/lu";
import { REGION_LABELS } from "@/services/program.filters";
import { ADMISSION_METHODS, formatMethodScore } from "@/services/scoring.service";
import { useTrovio } from "@/stores/trovio-store";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FitGapBadge } from "@/components/program/fit-badge";
import { Badge } from "@/components/ui/badge";
import { RecCard } from "./rec-card";
import { WhyDrawer } from "./why-drawer";
import { useRecommendations } from "./use-recommendations";

const LEGEND = [
  { tone: "success", label: "An toàn", text: "cao hơn điểm chuẩn từ 1 điểm" },
  { tone: "primary", label: "Vừa sức", text: "từ −0,5 đến dưới +1 điểm" },
  { tone: "accent", label: "Thử sức", text: "thấp hơn điểm chuẩn quá 0,5" },
] as const;

/** Trang /goi-y: gợi ý khớp mục tiêu, cảnh báo khi lệch, nhãn "Chưa đủ dữ liệu". */
export function RecommendationsView() {
  const { goal, profile, quiz, hydrated } = useTrovio();
  const { items, goal: goalInfo, userScore, budgetMax, hasInput, missing } = useRecommendations(9);
  const [onlyGoal, setOnlyGoal] = useState(false);
  const [why, setWhy] = useState<number | null>(null);

  const shown = useMemo(() => (items ?? []).filter((r) => !onlyGoal || r.goalMatch === "match" || r.goalMatch === "related"), [items, onlyGoal]);

  const chips = [
    goalInfo && `Ngành: ${goalInfo.majorName}`,
    goal?.targetScore != null && `Điểm mục tiêu ${formatMethodScore(goal.targetScore, goal.method)}${goal.combo ? ` · ${goal.combo}` : ""}`,
    profile && userScore != null && `Điểm hiện tại ${formatMethodScore(userScore, profile.method ?? "thpt")} · ${ADMISSION_METHODS[profile.method ?? "thpt"].short}`,
    quiz && `RIASEC ${quiz.result.code.join("-")}`,
    (goal?.regions?.length ? goal.regions : profile?.regions ?? []).length > 0 &&
      `Khu vực: ${(goal?.regions?.length ? goal.regions : profile!.regions).map((r) => REGION_LABELS[r]).join(", ")}`,
    budgetMax != null && `Ngân sách ≤ ${budgetMax} triệu/năm`,
  ].filter(Boolean) as string[];

  return (
    <>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">Gợi ý dành cho bạn</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items && items.length > 0 ? `${items.length} chương trình · ` : ""}
            {goalInfo ? "sắp theo mức khớp mục tiêu, rồi tới mức phù hợp" : "sắp theo mức phù hợp với hồ sơ của bạn"}
          </p>
        </div>
        {goalInfo && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <span className="relative inline-flex">
              <input type="checkbox" className="peer sr-only" checked={onlyGoal} onChange={(e) => setOnlyGoal(e.target.checked)} />
              <span className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300" />
              <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
            </span>
            Chỉ hiện ngành khớp mục tiêu
          </label>
        )}
      </div>

      <Card className="mt-5 flex flex-wrap items-center gap-4 border-primary-200 px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <LuAward className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-600">{goal ? "Mục tiêu của bạn" : "Bạn chưa đặt mục tiêu"}</p>
          {chips.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span key={c} className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-700">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Trả lời 4 câu ngắn để Trovio ưu tiên ngành bạn nhắm và cảnh báo khi gợi ý lệch mục tiêu.</p>
          )}
        </div>
        <Link href="/muc-tieu" className={buttonClass({ variant: "outline", size: "sm" })}>
          <LuTarget className="size-4" aria-hidden /> {goal ? "Sửa mục tiêu" : "Đặt mục tiêu"}
        </Link>
      </Card>

      {goalInfo?.warning && (
        <p role="note" className="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-3.5 text-[13px] text-accent-700">
          <strong>Lưu ý về mục tiêu: </strong>
          {goalInfo.warning}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600" aria-label="Ý nghĩa nhãn khả năng">
        <span className="font-semibold text-slate-700">Nhãn khả năng:</span>
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <Badge tone={l.tone}>{l.label}</Badge> {l.text}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <FitGapBadge reason="no-score" /> chưa có điểm hoặc &lt; 3 năm điểm chuẩn — Trovio không đoán
        </span>
      </div>

      {!hydrated || items === null ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-60 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : !hasInput ? (
        <Card className="mt-6 flex flex-col items-start gap-4 p-6 md:flex-row md:items-center">
          <p className="flex-1 text-sm text-slate-600">Chưa có dữ liệu để gợi ý. Làm trắc nghiệm, nhập điểm hoặc đặt mục tiêu trước nhé.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/muc-tieu" className={buttonClass()}>
              <LuTarget className="size-4" aria-hidden /> Đặt mục tiêu
            </Link>
            <Link href="/trac-nghiem" className={buttonClass({ variant: "outline" })}>
              <LuCompass className="size-4" aria-hidden /> Làm trắc nghiệm
            </Link>
            <Link href="/diem-cua-toi" className={buttonClass({ variant: "ghost" })}>
              <LuCalculator className="size-4" aria-hidden /> Nhập điểm
            </Link>
          </div>
        </Card>
      ) : shown.length === 0 ? (
        <Card className="mt-6 p-6 text-sm text-slate-600">
          {onlyGoal ? "Không có chương trình nào khớp mục tiêu với điều kiện hiện tại." : "Chưa tìm được chương trình phù hợp với ngân sách và khu vực bạn chọn."}{" "}
          <Link href="/muc-tieu" className="font-semibold text-primary-600 hover:underline">
            Điều chỉnh mục tiêu
          </Link>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((rec) => {
            const i = items.indexOf(rec);
            return (
              <li key={rec.view.program.id}>
                <RecCard rec={rec} goalName={goalInfo?.majorName ?? null} budgetMax={budgetMax} onWhy={() => setWhy(i)} />
              </li>
            );
          })}
        </ul>
      )}

      {missing.includes("score") && hasInput && (
        <p className={cn("mt-4 text-[13px] text-slate-600")}>
          Chưa có điểm nên các thẻ hiện “Chưa đủ dữ liệu”.{" "}
          <Link href="/diem-cua-toi" className="font-semibold text-primary-600 hover:underline">
            Nhập điểm để xem mức An toàn / Vừa sức / Thử sức
          </Link>
        </p>
      )}
      <p className="mt-6 text-xs text-slate-500">
        Ngưỡng nhãn: cao hơn điểm chuẩn năm gần nhất ≥ 1 điểm là An toàn; từ −0,5 đến dưới +1 là Vừa sức; thấp hơn quá 0,5 là Thử sức. Điểm chuẩn, học phí là dữ liệu minh hoạ.{" "}
        <Link href="/cach-goi-y" className="font-semibold text-primary-600 hover:underline">
          Cách Trovio gợi ý
        </Link>
      </p>
      {why != null && items?.[why] && (
        <WhyDrawer rec={items[why]} rank={why + 1} total={items.length} userScore={userScore} onClose={() => setWhy(null)} />
      )}
    </>
  );
}
