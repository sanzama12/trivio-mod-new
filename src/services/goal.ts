/**
 * Hàm thuần cho "Đặt mục tiêu qua hội thoại": chỉ hiện tổ hợp ngành đó thật sự xét,
 * chọn chương trình làm mốc điểm chuẩn 3 năm, xem trước số chương trình theo nhãn khả năng.
 */
import type { AdmissionMethodKey, Combo, FitLevel, Goal, Region } from "../domain/types";
import type { LiteProgram } from "./lite";
import { ADMISSION_METHODS, FIT_THRESHOLDS, fitLevelOf } from "./scoring.service";

export const SUBJECT_SHORT: Record<string, string> = { toan: "Toán", ly: "Lý", hoa: "Hoá", sinh: "Sinh", van: "Văn", su: "Sử", dia: "Địa", anh: "Anh", ve: "Vẽ" };

export const comboLabel = (combo: { subjects: readonly string[] }) => combo.subjects.map((s) => SUBJECT_SHORT[s] ?? s).join(" · ");

export type GoalChoice = { method: AdmissionMethodKey; combo: string | null; count: number };

/** Các cách xét tuyển hợp lệ cho một ngành: tổ hợp THPT mà ít nhất một chương trình của ngành dùng + ĐGNL nếu có. */
export function choicesForMajor(programs: LiteProgram[], majorId: string): GoalChoice[] {
  const ofMajor = programs.filter((p) => p.majorId === majorId);
  const combos = new Map<string, number>();
  for (const p of ofMajor) if (p.cutoffs.length) for (const c of p.combos) combos.set(c, (combos.get(c) ?? 0) + 1);
  const out: GoalChoice[] = [...combos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([combo, count]) => ({ method: "thpt", combo, count }));
  const hb = ofMajor.filter((p) => p.altCutoffs.some((a) => a.method === "hocba")).length;
  if (hb) out.push({ method: "hocba", combo: null, count: hb });
  return out;
}

/** Tổ hợp KHÔNG dùng cho ngành (để nói rõ "đã ẩn"). */
export function hiddenCombos(all: Combo[], choices: GoalChoice[]): string[] {
  const used = new Set(choices.map((c) => c.combo).filter(Boolean));
  return all.map((c) => c.code).filter((c) => !used.has(c));
}

export function cutoffsOf(p: LiteProgram, method: AdmissionMethodKey): { year: number; score: number; estimated?: boolean }[] {
  if (method === "thpt") return p.cutoffs;
  return p.altCutoffs.filter((a) => a.method === method).map((a) => ({ year: a.year, score: a.score, estimated: a.estimated }));
}

export function acceptsChoice(p: LiteProgram, method: AdmissionMethodKey, combo: string | null): boolean {
  if (cutoffsOf(p, method).length === 0) return false;
  return !ADMISSION_METHODS[method].needsCombo || !combo || p.combos.includes(combo);
}

/** Chương trình mốc mặc định: của ngành mục tiêu, nhận cách xét tuyển đã chọn, điểm chuẩn gần trung vị nhất. */
export function defaultRefProgram(programs: LiteProgram[], majorId: string, method: AdmissionMethodKey, combo: string | null): LiteProgram | null {
  const list = programs.filter((p) => p.majorId === majorId && acceptsChoice(p, method, combo));
  if (!list.length) return null;
  const scores = list.map((p) => cutoffsOf(p, method)[0].score).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)];
  return [...list].sort((a, b) => Math.abs(cutoffsOf(a, method)[0].score - median) - Math.abs(cutoffsOf(b, method)[0].score - median))[0];
}

/** Khoảng thanh kéo điểm mục tiêu quanh các điểm chuẩn (thang của phương thức). */
export function sliderRange(ref: LiteProgram | null, method: AdmissionMethodKey): { min: number; max: number; step: number } {
  const { max, factor } = ADMISSION_METHODS[method];
  const step = method === "thpt" || method === "hocba" ? 0.05 : factor >= 40 ? 10 : 1;
  if (!ref) return { min: Math.round(max * 0.5), max, step };
  const values = cutoffsOf(ref, method).map((c) => c.score);
  const lo = Math.max(0, Math.floor(Math.min(...values) - 2 * factor));
  const hi = Math.min(max, Math.ceil(Math.max(...values) + 2 * factor));
  return { min: lo, max: Math.max(hi, lo + factor), step };
}

/** Nhận xét điểm mục tiêu so với điểm chuẩn năm gần nhất của chương trình mốc. */
export function targetVerdict(target: number, ref: LiteProgram, method: AdmissionMethodKey): { level: FitLevel; diff: number; safeFrom: number; year: number; cutoff: number } {
  const latest = cutoffsOf(ref, method)[0];
  const f = ADMISSION_METHODS[method].factor;
  const diff = Math.round((target - latest.score) * 100) / 100;
  return { level: fitLevelOf(diff, method), diff, safeFrom: Math.round((latest.score + FIT_THRESHOLDS.safe * f) * 100) / 100, year: latest.year, cutoff: latest.score };
}

/** Đếm chương trình của ngành mục tiêu theo nhãn khả năng (dùng điểm mục tiêu, lọc khu vực + ngân sách). */
export function previewCounts(programs: LiteProgram[], goal: Pick<Goal, "majorId" | "method" | "combo" | "targetScore" | "regions" | "budgetMax">): Record<FitLevel, number> & { total: number } {
  const out = { "an-toan": 0, "vua-suc": 0, "thu-suc": 0, total: 0 };
  if (!goal.majorId) return out;
  for (const p of programs) {
    if (p.majorId !== goal.majorId || !acceptsChoice(p, goal.method, goal.combo)) continue;
    if (goal.regions.length && !goal.regions.includes(p.region as Region)) continue;
    if (goal.budgetMax != null && p.tuitionMin > goal.budgetMax) continue;
    out.total++;
    if (goal.targetScore != null) out[fitLevelOf(goal.targetScore - cutoffsOf(p, goal.method)[0].score, goal.method)]++;
  }
  return out;
}
