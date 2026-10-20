/**
 * Ma trận quyết định có trọng số (MCDM — phương pháp cộng có trọng số / SAW).
 * Học sinh tự đặt trọng số 0–5 cho 6 tiêu chí; mỗi chương trình được chấm 1–5 từ dữ liệu.
 * Tổng = Σ(trọng số × điểm) / (5 × Σ trọng số) × 100. Hàm thuần — dùng chung client & kiểm thử.
 */
import type { AdmissionMethodKey, Region, RiasecResult, RiasecType } from "../domain/types";
import { matchMajor } from "./riasec-match";
import { ADMISSION_METHODS, FIT_LABELS, fitLevelOf, formatMethodScore } from "./scoring.service";
import { formatTuition, hasTuitionData } from "../lib/format";

export const DECISION_KEYS = ["interest", "admission", "tuition", "distance"] as const;
export type DecisionKey = (typeof DECISION_KEYS)[number];

export const DECISION_LABELS: Record<DecisionKey, string> = {
  interest: "Hợp sở thích",
  admission: "Khả năng trúng tuyển",
  tuition: "Học phí",
  distance: "Gần nhà",
};

export type Weights = Record<DecisionKey, number>;

export const WEIGHT_PRESETS: { key: string; label: string; weights: Weights }[] = [
  { key: "balanced", label: "Cân bằng", weights: { interest: 3, admission: 3, tuition: 3, distance: 3 } },
  { key: "safe", label: "Ưu tiên đỗ chắc", weights: { interest: 3, admission: 5, tuition: 3, distance: 2 } },
  { key: "career", label: "Ưu tiên phù hợp", weights: { interest: 5, admission: 2, tuition: 2, distance: 1 } },
  { key: "budget", label: "Tiết kiệm", weights: { interest: 3, admission: 3, tuition: 5, distance: 4 } },
];
export const DEFAULT_WEIGHTS: Weights = { interest: 5, admission: 4, tuition: 3, distance: 2 };

export const WEIGHT_WORDS = ["Không quan trọng", "Ít quan trọng", "Hơi quan trọng", "Quan trọng", "Rất quan trọng", "Quan trọng nhất"];

export interface DecisionRow {
  programId: string;
  slug: string;
  name: string;
  schoolName: string;
  schoolCode: string;
  city: string;
  region: Region;
  majorRiasec: RiasecType[];
  /** Điểm chuẩn gần nhất theo từng phương thức (THPT + phương thức khác). */
  cutoffs: Partial<Record<AdmissionMethodKey, number>>;
  tuitionMin: number;
  tuitionMax: number;
}

export interface DecisionContext {
  riasec?: Pick<RiasecResult, "percents" | "code"> | null;
  score?: { method: AdmissionMethodKey; total: number } | null;
  budgetMax?: number | null;
  homeRegion?: Region | null;
}

export interface Rating {
  score: 1 | 2 | 3 | 4 | 5 | null;
  text: string;
  /** Thiếu dữ liệu → không chấm và không đưa tiêu chí vào tổng. */
  missing: boolean;
}

const neutral = (text: string): Rating => ({ score: null, text, missing: true });

export function rateRow(row: DecisionRow, ctx: DecisionContext): Record<DecisionKey, Rating> {
  // Sở thích
  let interest = neutral("Chưa làm trắc nghiệm");
  if (ctx.riasec) {
    const m = matchMajor(ctx.riasec, { riasec: row.majorRiasec as [RiasecType, RiasecType, RiasecType] });
    interest = { score: m >= 80 ? 5 : m >= 65 ? 4 : m >= 50 ? 3 : m >= 35 ? 2 : 1, text: `${m}%`, missing: false };
  }
  // Khả năng trúng tuyển
  let admission = neutral(ctx.score ? "Không xét phương thức của bạn" : "Chưa có điểm");
  if (ctx.score) {
    const cut = row.cutoffs[ctx.score.method];
    if (cut != null) {
      const f = ADMISSION_METHODS[ctx.score.method].factor;
      const diff = (ctx.score.total - cut) / f;
      const score = diff >= 1 ? 5 : diff >= 0 ? 4 : diff >= -0.5 ? 3 : diff >= -1.5 ? 2 : 1;
      admission = { score, text: `${FIT_LABELS[fitLevelOf(ctx.score.total - cut, ctx.score.method)]} (chuẩn ${formatMethodScore(cut, ctx.score.method)})`, missing: false };
    }
  }
  // Học phí
  const tuitionKnown = hasTuitionData(row.tuitionMin, row.tuitionMax);
  const avg = (row.tuitionMin + row.tuitionMax) / 2;
  const tuitionText = formatTuition(row.tuitionMin, row.tuitionMax);
  const tuition: Rating = !tuitionKnown
    ? neutral(tuitionText)
    : ctx.budgetMax != null && ctx.budgetMax > 0
      ? { score: avg <= ctx.budgetMax * 0.6 ? 5 : avg <= ctx.budgetMax * 0.8 ? 4 : avg <= ctx.budgetMax ? 3 : avg <= ctx.budgetMax * 1.3 ? 2 : 1, text: tuitionText, missing: false }
      : { score: avg <= 15 ? 5 : avg <= 25 ? 4 : avg <= 35 ? 3 : avg <= 60 ? 2 : 1, text: tuitionText, missing: false };
  // Gần nhà
  const distance: Rating = ctx.homeRegion ? (row.region === ctx.homeRegion ? { score: 5, text: `${row.city} · cùng miền`, missing: false } : { score: 2, text: `${row.city} · khác miền`, missing: false }) : neutral(`${row.city} · chưa có tỉnh/thành của bạn`);
  return { interest, admission, tuition, distance };
}

export function sanitizeWeights(input: unknown): Weights {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_WEIGHTS };
  for (const k of DECISION_KEYS) {
    const v = src[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.max(0, Math.min(5, Math.round(v)));
  }
  return out;
}

/** Tổng có trọng số, thang 0–100. Tiêu chí thiếu được loại và trọng số còn lại được chuẩn hoá lại. */
export function weightedTotal(ratings: Record<DecisionKey, Rating>, weights: Weights): number {
  const available = DECISION_KEYS.filter((key) => ratings[key].score != null && weights[key] > 0);
  const sumW = available.reduce((sum, key) => sum + weights[key], 0);
  if (sumW === 0) return 0;
  const sum = available.reduce((value, key) => value + weights[key] * ratings[key].score!, 0);
  return Math.round((sum / (5 * sumW)) * 100);
}

/** Phần trọng số đang có dữ liệu để chấm, dùng để người dùng đánh giá độ đầy đủ của kết quả. */
export function weightedCoverage(ratings: Record<DecisionKey, Rating>, weights: Weights): number {
  const total = DECISION_KEYS.reduce((sum, key) => sum + weights[key], 0);
  if (total === 0) return 0;
  const available = DECISION_KEYS.reduce((sum, key) => sum + (ratings[key].score == null ? 0 : weights[key]), 0);
  return Math.round((available / total) * 100);
}

export interface RankedRow {
  row: DecisionRow;
  ratings: Record<DecisionKey, Rating>;
  total: number;
  coverage: number;
  rank: number;
}

export function rankRows(rows: DecisionRow[], ctx: DecisionContext, weights: Weights): RankedRow[] {
  const scored = rows.map((row) => {
    const ratings = rateRow(row, ctx);
    return { row, ratings, total: weightedTotal(ratings, weights), coverage: weightedCoverage(ratings, weights), rank: 0 };
  });
  const sorted = [...scored].sort((a, b) => b.total - a.total || b.coverage - a.coverage);
  sorted.forEach((r, i) => (r.rank = i > 0 && r.total === sorted[i - 1].total ? sorted[i - 1].rank : i + 1));
  return scored;
}

/** Tiêu chí đóng góp nhiều nhất giúp chương trình dẫn đầu vượt chương trình thứ hai (để giải thích). */
export function leadReasons(first: RankedRow, second: RankedRow, weights: Weights): DecisionKey[] {
  return DECISION_KEYS.map((k) => {
    const firstScore = first.ratings[k].score;
    const secondScore = second.ratings[k].score;
    return { k, d: firstScore == null || secondScore == null ? 0 : weights[k] * (firstScore - secondScore) };
  })
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d)
    .slice(0, 2)
    .map((x) => x.k);
}
