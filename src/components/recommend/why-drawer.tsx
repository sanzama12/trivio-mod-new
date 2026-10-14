"use client";

import Link from "next/link";
import { useRef } from "react";
import { LuChartBar, LuCircleAlert, LuFolderOpen, LuLightbulb, LuMapPin, LuPuzzle, LuShieldCheck, LuWallet, LuX } from "react-icons/lu";
import type { RecCriterion, Recommendation } from "@/services/recommendation.service";
import { ADMISSION_METHODS, FIT_THRESHOLDS, formatMethodScore } from "@/services/scoring.service";
import { cn } from "@/lib/cn";
import { useModal } from "@/components/ui/use-modal";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { FitBadge, FitGapBadge } from "@/components/program/fit-badge";
import { SchoolCode } from "@/components/program/program-card";
import { StyleWhyBlock } from "@/components/work-style/style-bits";

const ICONS = { interest: LuPuzzle, fit: LuChartBar, place: LuMapPin, group: LuFolderOpen } as const;
const TONE: Record<RecCriterion["status"], string> = {
  good: "bg-success-50 text-success-700",
  ok: "bg-primary-50 text-primary-700",
  weak: "bg-accent-50 text-accent-700",
  missing: "bg-slate-100 text-slate-600",
};

/** Biểu đồ cột điểm chuẩn 3 năm + đường điểm của bạn (thang 30). */
export function CutoffMiniChart({ history, userScore, className }: { history: { year: number; score: number }[]; userScore: number | null; className?: string }) {
  if (history.length === 0) return null;
  const rows = [...history].sort((a, b) => a.year - b.year);
  const values = [...rows.map((r) => r.score), ...(userScore != null ? [userScore] : [])];
  const lo = Math.floor(Math.min(...values) - 0.5);
  const hi = Math.ceil(Math.max(...values) + 0.3);
  const H = 104;
  const y = (v: number) => H - ((v - lo) / Math.max(0.5, hi - lo)) * (H - 22);
  const W = 100 / rows.length;
  return (
    <figure className={cn("mt-2", className)}>
      <svg viewBox={`0 0 300 ${H + 20}`} className="h-auto w-full" role="img" aria-label={`Điểm chuẩn ${rows.map((r) => `${r.year}: ${r.score}`).join(", ")}${userScore != null ? `; điểm của bạn ${userScore}` : ""}`}>
        {rows.map((r, i) => {
          const cx = (i + 0.5) * W * 3;
          return (
            <g key={r.year}>
              <rect x={cx - 24} y={y(r.score)} width={48} height={H - y(r.score)} rx={6} className="fill-primary-200" />
              <text x={cx} y={y(r.score) - 6} textAnchor="middle" className="fill-slate-700 text-[12px] font-semibold">
                {r.score.toFixed(2)}
              </text>
              <text x={cx} y={H + 15} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {r.year}
              </text>
            </g>
          );
        })}
        {userScore != null && (
          <g>
            <line x1={4} x2={296} y1={y(userScore)} y2={y(userScore)} className="stroke-primary-600" strokeWidth={2} strokeDasharray="6 4" />
            <text x={6} y={Math.max(12, y(userScore) - 6)} className="fill-primary-700 text-[11px] font-bold">
              Điểm của bạn: {userScore.toFixed(2)}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/** Ngưỡng điểm thay đổi nhãn: giảm bao nhiêu thì sang Thử sức, thêm bao nhiêu thì An toàn. */
function whatIf(rec: Recommendation, userScore: number | null): string[] {
  const out: string[] = [];
  const cut = rec.history[0];
  const method = rec.view.cutoffMethod;
  if (userScore != null && cut && method === "thpt" && rec.view.fit) {
    const diff = userScore - cut.score;
    const toReach = diff - FIT_THRESHOLDS.reach;
    const toSafe = FIT_THRESHOLDS.safe - diff;
    if (rec.view.fit.level !== "thu-suc") out.push(`Điểm giảm hơn ${toReach.toFixed(2)} → chuyển sang Thử sức (thấp hơn chuẩn quá 0,5).`);
    if (rec.view.fit.level !== "an-toan") out.push(`Cần thêm ${Math.max(0, toSafe).toFixed(2)} điểm để thành An toàn (cao hơn chuẩn từ 1 điểm).`);
  }
  out.push(`Ngân sách dưới ${rec.view.program.tuitionMin} triệu/năm → chương trình này bị loại khỏi gợi ý.`);
  return out;
}

export function WhyDrawer({
  rec,
  rank,
  total,
  userScore,
  onClose,
}: {
  rec: Recommendation;
  rank: number;
  total: number;
  /** Điểm xét tuyển của người dùng (cùng phương thức với gợi ý); null nếu chưa có. */
  userScore: number | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useModal(ref, true, onClose);
  const { view: v } = rec;
  const method = v.cutoffMethod;
  const uncertain = [
    v.cutoffEstimated && "Điểm chuẩn phương thức này là số ước tính, chưa phải số trường công bố.",
    `Điểm chuẩn ${new Date().getFullYear()} chưa công bố — nhãn khả năng dựa trên điểm chuẩn năm gần nhất và xu hướng 3 năm.`,
    "Điểm chuẩn, học phí trong bản demo là dữ liệu minh hoạ.",
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="why-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl"
      >
        <div className="border-b border-slate-200 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary-600 uppercase">
              <LuLightbulb className="size-3.5" aria-hidden /> Vì sao gợi ý?
            </p>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              <LuX className="size-5" aria-hidden />
            </button>
          </div>
          <h2 id="why-title" className="mt-1 text-xl font-bold text-slate-900">
            Vì sao Trovio gợi ý chương trình này?
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <SchoolCode code={v.school.code} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{v.program.name}</p>
              <p className="truncate text-[13px] text-primary-600">
                {v.school.name} · {v.school.city}
              </p>
            </div>
            {rec.fitGap ? <FitGapBadge reason={rec.fitGap} /> : <FitBadge fit={v.fit} />}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="flex items-center gap-4 rounded-2xl bg-primary-50 p-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary-700">{rec.score}</p>
              <p className="text-xs font-medium text-primary-700">/100 phù hợp</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                Xếp #{rank} trong {total} gợi ý dành cho bạn
              </p>
              <p className="mt-1 text-xs text-slate-700">
                Điểm phù hợp = 4 tiêu chí nhân trọng số; học phí là bộ lọc. Không trường nào trả tiền để được xếp hạng.
              </p>
            </div>
          </div>

          {rec.warning && (
            <p className="flex gap-2 rounded-xl border border-accent-200 bg-accent-50 p-3 text-[13px] text-accent-700">
              <LuCircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {rec.warning}
            </p>
          )}

          <h3 className="text-sm font-semibold text-slate-700">4 tiêu chí + 1 bộ lọc Trovio đã xét</h3>
          <ul className="space-y-3">
            {rec.criteria.map((c) => {
              const Icon = ICONS[c.key];
              return (
                <li key={c.key} className="flex gap-3 rounded-xl border border-slate-200 p-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="flex-1 font-semibold text-slate-900">{c.label}</p>
                      <span className="text-[11px] font-medium text-slate-500">trọng số {Math.round(c.weight * 100)}%</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[c.status])}>{c.value}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-600">{c.detail}</p>
                    {c.key === "fit" && method === "thpt" && rec.history.length > 0 && <CutoffMiniChart history={rec.history} userScore={userScore} />}
                  </div>
                </li>
              );
            })}
            <li className="flex gap-3 rounded-xl border border-dashed border-slate-300 p-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                <LuWallet className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-semibold text-slate-900">Học phí</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">bộ lọc</span>
                </div>
                <p className="mt-1 text-[13px] text-slate-600">{rec.budgetNote}</p>
              </div>
            </li>
          </ul>

          <StyleWhyBlock major={v.major} />

          <div className="rounded-xl bg-success-50 p-3.5">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success-700">
              <LuShieldCheck className="size-4" aria-hidden /> Trovio không dùng
            </p>
            <p className="mt-1 text-[13px] text-slate-700">Ngày sinh, cung hoàng đạo, thần số học hay mạng xã hội của bạn. Gợi ý chỉ dựa trên kết quả trắc nghiệm, điểm và các điều kiện bạn tự chọn.</p>
          </div>

          <div className="rounded-xl bg-accent-50 p-3.5">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-700">
              <LuCircleAlert className="size-4" aria-hidden /> Điều Trovio chưa chắc chắn
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-slate-700">
              {uncertain.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[13px] font-semibold text-slate-900">Nếu thay đổi…</p>
            <ul className="mt-1 space-y-0.5 text-[13px] text-slate-600">
              {whatIf(rec, userScore).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            {userScore != null && (
              <p className="mt-2 text-xs text-slate-500">
                Điểm đang dùng: {formatMethodScore(userScore, method)} ({ADMISSION_METHODS[method].short}).
              </p>
            )}
          </div>
          <Link href="/cach-goi-y#danh-cho-ban" className="inline-block text-sm font-semibold text-primary-600 hover:underline">
            Đọc đầy đủ cách Trovio gợi ý →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3.5 sm:px-6">
          <p className="flex-1 text-[13px] font-medium text-slate-700">Giải thích này có dễ hiểu không?</p>
          <Button size="sm" variant="outline" onClick={() => (toast("Cảm ơn bạn đã góp ý!", "success"), onClose())}>
            Dễ hiểu
          </Button>
          <Link href="/tro-giup#bao-loi" className="px-2 text-[13px] font-semibold text-primary-600 hover:underline">
            Chưa rõ
          </Link>
        </div>
      </div>
    </div>
  );
}
