/**
 * Kế hoạch B & mùa công bố điểm: chấm lại nguyện vọng với điểm thật, gợi ý đường đi thay thế,
 * theo dõi xét tuyển bổ sung. Hàm thuần — dùng chung client, server và kiểm thử.
 */
import type { AdmissionMethodKey, FitLevel, Region } from "../domain/types";
import type { SupplementaryRound } from "../domain/types";
import type { LiteProgram } from "./lite";
import { ADMISSION_METHODS, fitLevelOf } from "./scoring.service";
import { acceptsChoice, cutoffsOf } from "./goal";

export type RoundStatus = "sap-mo" | "dang-nhan" | "da-dong";
export const ROUND_STATUS_LABELS: Record<RoundStatus, string> = { "sap-mo": "Sắp mở", "dang-nhan": "Đang nhận", "da-dong": "Đã đóng" };

/** Trạng thái đợt bổ sung tại ngày `today` (YYYY-MM-DD, giờ Việt Nam). */
export function roundStatus(r: Pick<SupplementaryRound, "opens" | "closes">, today: string): RoundStatus {
  if (today < r.opens) return "sap-mo";
  if (today > r.closes) return "da-dong";
  return "dang-nhan";
}

export interface PlanScore {
  method: AdmissionMethodKey;
  total: number;
  combo: string | null;
}

export interface ReEvaluated {
  program: LiteProgram;
  cutoff: number | null;
  diff: number | null;
  level: FitLevel | null;
  /** Lý do không chấm được: không xét phương thức / tổ hợp của bạn. */
  reason: "method" | "combo" | null;
}

export function reEvaluate(programs: LiteProgram[], score: PlanScore): ReEvaluated[] {
  return programs.map((p) => {
    const cuts = cutoffsOf(p, score.method);
    if (!cuts.length) return { program: p, cutoff: null, diff: null, level: null, reason: "method" };
    if (ADMISSION_METHODS[score.method].needsCombo && score.combo && !p.combos.includes(score.combo)) return { program: p, cutoff: cuts[0].score, diff: null, level: null, reason: "combo" };
    const diff = Math.round((score.total - cuts[0].score) * 100) / 100;
    return { program: p, cutoff: cuts[0].score, diff, level: fitLevelOf(diff, score.method), reason: null };
  });
}

/** Danh sách có ít nhất một nguyện vọng An toàn chưa? */
export const hasSafe = (items: ReEvaluated[]) => items.some((i) => i.level === "an-toan");

export interface PlanBOption {
  program: LiteProgram;
  level: FitLevel;
  diff: number;
  kind: "same-major" | "related" | "international";
}

export interface PlanBInput {
  score: PlanScore;
  /** Ngành của các nguyện vọng hiện tại + ngành mục tiêu. */
  majorIds: string[];
  groupIds: string[];
  excludeIds: string[];
  budgetMax?: number | null;
  regions?: Region[];
}

/** Gợi ý kế hoạch B: cùng ngành ở trường khác → ngành gần (cùng nhóm) → chương trình liên kết/quốc tế; chỉ An toàn / Vừa sức. */
export function suggestPlanB(programs: LiteProgram[], input: PlanBInput, limit = 6): PlanBOption[] {
  const out: PlanBOption[] = [];
  for (const p of programs) {
    if (input.excludeIds.includes(p.id)) continue;
    if (!acceptsChoice(p, input.score.method, input.score.combo)) continue;
    if (input.budgetMax != null && p.tuitionMin > input.budgetMax) continue;
    if (input.regions?.length && !input.regions.includes(p.region)) continue;
    const diff = Math.round((input.score.total - cutoffsOf(p, input.score.method)[0].score) * 100) / 100;
    const level = fitLevelOf(diff, input.score.method);
    if (level === "thu-suc") continue;
    const kind: PlanBOption["kind"] | null = input.majorIds.includes(p.majorId)
      ? "same-major"
      : input.groupIds.includes(p.groupId)
        ? "related"
        : p.trainingType === "Quốc tế" || p.trainingType === "Tiên tiến"
          ? "international"
          : null;
    if (kind) out.push({ program: p, level, diff, kind });
  }
  const kindRank = { "same-major": 0, related: 1, international: 2 } as const;
  // Ưu tiên: cùng ngành; trong mỗi nhóm, An toàn với biên độ nhỏ nhất (trường tốt nhất mà vẫn chắc) trước.
  out.sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || (a.level === b.level ? 0 : a.level === "an-toan" ? -1 : 1) || a.diff - b.diff);
  return out.slice(0, limit);
}

export interface RoundMatch {
  round: SupplementaryRound;
  program: LiteProgram;
  status: RoundStatus;
  /** Điểm của bạn đủ mức nhận hồ sơ. */
  eligible: boolean;
  /** Thuộc ngành/nhóm ngành bạn quan tâm. */
  relevant: boolean;
}

export function matchRounds(
  rounds: SupplementaryRound[],
  programs: LiteProgram[],
  today: string,
  score: PlanScore | null,
  majorIds: string[],
  groupIds: string[],
): RoundMatch[] {
  return rounds
    .map((round) => {
      const program = programs.find((p) => p.id === round.programId);
      if (!program) return null;
      const comboOk = !score?.combo || round.combos.includes(score.combo);
      return {
        round,
        program,
        status: roundStatus(round, today),
        eligible: !!score && score.method === "thpt" && comboOk && score.total >= round.minScore,
        relevant: majorIds.includes(program.majorId) || groupIds.includes(program.groupId),
      };
    })
    .filter((x): x is RoundMatch => !!x)
    .sort((a, b) => Number(b.relevant) - Number(a.relevant) || Number(b.eligible) - Number(a.eligible) || a.round.opens.localeCompare(b.round.opens));
}
