/**
 * SERVICE LAYER — gợi ý "Dành cho bạn": kết hợp sở thích (RIASEC), điểm & phương thức, tỉnh/thành, ngân sách.
 * Minh bạch: mỗi gợi ý kèm lý do + bảng tiêu chí (màn "Vì sao Trovio gợi ý?"); trọng số mô tả ở /cach-goi-y.
 * Không dùng ngày sinh, cung hoàng đạo hay thần số học.
 */
import type { AdmissionMethodKey, CutoffScore, Major, RiasecResult, RiasecType, Region } from "../domain/types";
import { regionOfProvince } from "../domain/provinces";
import { RIASEC_INFO } from "../domain/riasec";
import { REGION_LABELS } from "./program.filters";
import { programService, type ProgramView } from "./program.service";
import { matchMajor } from "./riasec.service";
import { ADMISSION_METHODS, computeFit, cutoffFor, FIT_LABELS, formatMethodScore } from "./scoring.service";
import { repositories } from "../repositories";
import { effectiveRecommendConfig, riasecTypeWeights, type EffectiveRecommendConfig } from "./rules.service";

export type RecommendFocus = "balanced" | "passion" | "admission" | "location_budget";

export const FOCUS_WEIGHTS: Record<RecommendFocus, { interest: number; fit: number; place: number; group: number }> = {
  balanced: { interest: 0.45, fit: 0.35, place: 0.1, group: 0.1 },
  passion: { interest: 0.6, fit: 0.25, place: 0.08, group: 0.07 },
  admission: { interest: 0.25, fit: 0.55, place: 0.1, group: 0.1 },
  location_budget: { interest: 0.3, fit: 0.3, place: 0.25, group: 0.15 },
};

export interface RecommendInput {
  riasec?: Pick<RiasecResult, "percents" | "code"> | null;
  score?: { method: AdmissionMethodKey; total: number; combo: string } | null;
  budgetMax?: number | null;
  regions?: Region[];
  groupIds?: string[];
  province?: string | null;
  /** Ngành mục tiêu (đặt ở /muc-tieu). */
  goalMajorId?: string | null;
  /** Định hướng ưu tiên (Cân bằng / Đam mê / Trúng tuyển / Địa điểm & Chi phí). */
  focus?: RecommendFocus;
}

export type CriterionKey = "interest" | "fit" | "place" | "group";

export interface RecCriterion {
  key: CriterionKey;
  label: string;
  /** Trọng số (0–1). */
  weight: number;
  /** Điểm thành phần 0–100. */
  points: number;
  status: "good" | "ok" | "weak" | "missing";
  /** Nhãn ngắn hiển thị cạnh tiêu chí (VD "77%", "Vừa sức"). */
  value: string;
  detail: string;
}

export type GoalMatch = "match" | "related" | "off";

/** Vì sao chưa gắn nhãn khả năng: chưa có điểm, hoặc chương trình có < 3 năm điểm chuẩn. */
export type FitGap = "no-score" | "few-years" | null;

export interface Recommendation {
  view: ProgramView;
  score: number;
  reasons: string[];
  criteria: RecCriterion[];
  /** Học phí là bộ lọc (không cộng điểm). */
  budgetNote: string;
  goalMatch: GoalMatch | null;
  /** Cảnh báo riêng cho gợi ý này (VD lệch mục tiêu). */
  warning: string | null;
  fitGap: FitGap;
  /** Điểm chuẩn THPT các năm (mới → cũ). */
  history: CutoffScore[];
  userRiasec: RiasecType[] | null;
  // Phân tích rủi ro & giải trình (GIAI ĐOẠN 5)
  fitScore: number;
  admissionRisk: "thap" | "trung-binh" | "cao" | "chua-xac-dinh";
  riskBand: "An toàn" | "Vừa sức" | "Thử sức" | "Chưa đủ dữ liệu";
  confidenceScore: number;
  confidenceBand: "cao" | "trung-binh" | "thap";
  officialDataRatio: number;
  estimatedDataRatio: number;
  volatility: number;
  dataYearsUsed: number;
  missingDataWarnings: string[];
  disclaimer: string;
}

export interface GoalSummary {
  majorId: string;
  majorName: string;
  majorRiasec: RiasecType[];
  /** % hợp sở thích với ngành mục tiêu (null nếu chưa làm trắc nghiệm). */
  interest: number | null;
  /** Cảnh báo khi kết quả RIASEC lệch xa ngành mục tiêu. */
  warning: string | null;
}

export const RECOMMEND_WEIGHTS = { interest: 0.45, fit: 0.35, place: 0.1, group: 0.1 } as const;
/** Điểm trúng tuyển: An toàn (100) > Vừa sức (85) > Thử sức (45). Không phạt nguyện vọng an toàn. */
const FIT_POINTS = { "an-toan": 100, "vua-suc": 85, "thu-suc": 45 } as const;
/** Cần đủ số năm điểm chuẩn THPT mới gắn nhãn An toàn / Vừa sức / Thử sức. */
export const MIN_CUTOFF_YEARS = 3;
/** Dưới ngưỡng này (% hợp sở thích) thì cảnh báo ngành mục tiêu lệch kết quả RIASEC. */
export const GOAL_INTEREST_WARNING = 50;

const riasecLabels = (types: RiasecType[]) => types.map((t) => RIASEC_INFO[t].label.toLowerCase()).join(", ");

/** Cảnh báo khi kết quả RIASEC lệch xa ngành mục tiêu (nói thẳng + giải thích). */
export function goalWarning(riasec: Pick<RiasecResult, "percents" | "code"> | null | undefined, major: Major): { interest: number | null; warning: string | null } {
  if (!riasec) return { interest: null, warning: null };
  const interest = matchMajor(riasec, major);
  if (interest >= GOAL_INTEREST_WARNING) return { interest, warning: null };
  const shared = major.riasec.filter((t) => riasec.code.includes(t));
  return {
    interest,
    warning:
      `Kết quả trắc nghiệm của bạn (${riasec.code.join("-")}) khá xa ngành ${major.name} (ngành cần ${major.riasec.join("-")}, khớp ${interest}%). ` +
      (shared.length
        ? `Hai bên chỉ chung nhóm ${riasecLabels(shared)}. `
        : "Hai bên không có nhóm sở thích chung nào trong 3 nhóm chính. ") +
      "Điều này không có nghĩa là bạn không học được — hãy xem kỹ chương trình học, hỏi sinh viên đang học, và cân nhắc thêm một ngành gần sở thích hơn.",
  };
}

const status = (points: number): RecCriterion["status"] => (points >= 75 ? "good" : points >= 50 ? "ok" : "weak");

export const recommendationService = {
  /** Trả về tối đa `limit` chương trình, đa dạng (≤ 2 cùng ngành — ngành mục tiêu ≤ 3, ≤ 2 cùng trường). */
  async recommend(
    input: RecommendInput,
    limit = 6,
    /** Cấu hình thay thế (trang Quy tắc gợi ý chạy thử trước khi lưu). */
    configOverride?: EffectiveRecommendConfig,
  ): Promise<{ items: Recommendation[]; missing: ("quiz" | "score")[]; goal: GoalSummary | null }> {
    const cfg = configOverride ?? (await effectiveRecommendConfig());
    const typeWeights = cfg.useTypeWeights ? await riasecTypeWeights() : null;
    const W = input.focus && FOCUS_WEIGHTS[input.focus] ? FOCUS_WEIGHTS[input.focus] : cfg.weights;
    const missing: ("quiz" | "score")[] = [];
    if (!input.riasec) missing.push("quiz");
    if (!input.score) missing.push("score");

    const goalMajor = input.goalMajorId ? await repositories.majors.findById(input.goalMajorId) : null;
    const goal: GoalSummary | null = goalMajor
      ? { majorId: goalMajor.id, majorName: goalMajor.name, majorRiasec: goalMajor.riasec, ...goalWarning(input.riasec, goalMajor) }
      : null;

    if (!input.riasec && !input.score && !input.groupIds?.length && !goalMajor) return { items: [], missing, goal };

    const home = regionOfProvince(input.province);
    const all = await programService.listAll();
    const scored: (Recommendation & { rank: number })[] = [];
    const budget = input.budgetMax != null && Number.isFinite(input.budgetMax) ? input.budgetMax : null;

    for (const view of all) {
      const { program, school, major } = view;
      const reasons: string[] = [];

      // Loại: vượt ngân sách, không xét phương thức/tổ hợp, ngoài khu vực đã chọn.
      if (budget != null && cfg.budgetTolerance != null && program.tuitionMin > budget * (1 + cfg.budgetTolerance / 100)) continue;
      if (input.regions?.length && !input.regions.includes(school.region)) continue;

      // --- Khả năng trúng tuyển
      let fitPts = 50;
      let fitGap: FitGap = input.score ? null : "no-score";
      let fitValue = "Chưa đủ dữ liệu";
      let fitDetail = "Chưa có điểm của bạn — Trovio không gắn nhãn An toàn / Vừa sức / Thử sức khi chưa có điểm.";
      if (input.score) {
        const { method, total, combo } = input.score;
        const cut = cutoffFor(program, method);
        if (!cut) continue;
        if (ADMISSION_METHODS[method].needsCombo && combo && !program.combos.includes(combo)) continue;
        const unit = ADMISSION_METHODS[method].short;
        if (method === "thpt" && program.cutoffs.length < cfg.minYears) {
          fitGap = "few-years";
          fitDetail = `Chương trình mới có ${program.cutoffs.length} năm điểm chuẩn — Trovio chỉ gắn nhãn khi có đủ ${cfg.minYears} năm.`;
        } else {
          const fit = computeFit(total, program, method)!;
          fitPts = FIT_POINTS[fit.level];
          fitValue = fit.label;
          const d = ADMISSION_METHODS[method].decimals;
          fitDetail =
            `${formatMethodScore(total, method)} điểm ${unit}, ${fit.diff >= 0 ? "cao" : "thấp"} hơn chuẩn ${cut.year} (${formatMethodScore(cut.score, method)}${cut.estimated ? ", ước tính" : ""}) ` +
            `${Math.abs(fit.diff).toFixed(d)} điểm → ${fit.label}.` +
            (fit.level === "vua-suc" ? " Chưa tới +1 điểm nên chưa phải An toàn." : fit.level === "thu-suc" ? " Nên xếp sau ít nhất một nguyện vọng An toàn." : "");
          if (fit.level !== "thu-suc") {
            reasons.push(`${FIT_LABELS[fit.level]} với ${formatMethodScore(total, method)} điểm ${unit} (chuẩn ${cut.year}: ${formatMethodScore(cut.score, method)}${cut.estimated ? ", ước tính" : ""})`);
          }
        }
      }

      // --- Sở thích
      let interest = 50;
      let interestDetail = "Chưa làm trắc nghiệm sở thích — tạm tính mức trung bình 50/100.";
      if (input.riasec) {
        interest = matchMajor(input.riasec, major);
        // Trọng số nhóm Holland do quản trị viên đặt (mặc định 1.0).
        if (typeWeights) interest = Math.min(100, Math.round(interest * (typeWeights[major.riasec[0]] ?? 1)));
        const shared = major.riasec.filter((t) => input.riasec!.code.includes(t));
        interestDetail = `Mã của bạn ${input.riasec.code.join("-")} · ngành cần ${major.riasec.join("-")} → chung ${shared.length}/3 nhóm chính${shared.length ? ` (${riasecLabels(shared)})` : ""}.`;
        if (interest >= 60 && shared.length) reasons.unshift(`Hợp sở thích ${riasecLabels(shared)} (${interest}% phù hợp)`);
      }

      // --- Nhóm ngành & vị trí
      const inGroup = !!input.groupIds?.includes(major.groupId);
      if (inGroup) reasons.push("Thuộc nhóm ngành bạn quan tâm");
      const near = home != null && school.region === home;
      if (near) reasons.push(`Cùng ${REGION_LABELS[school.region].toLowerCase()} với ${input.province}`);
      if (budget != null) reasons.push(`Học phí trong ngân sách ${budget} triệu/năm`);

      const placePts = near ? 100 : 40;
      const groupPts = inGroup ? 100 : 30;
      let score = Math.round(interest * W.interest + fitPts * W.fit + placePts * W.place + groupPts * W.group);
      // Quy tắc cộng điểm (bật ở trang Quy tắc gợi ý).
      if (cfg.boostCutoff && input.score && !fitGap) {
        const cut = cutoffFor(program, input.score.method);
        if (cut && Math.abs(input.score.total - cut.score) / ADMISSION_METHODS[input.score.method].factor <= cfg.boostCutoff.gap) score += cfg.boostCutoff.points;
      }
      for (const b of cfg.boostSchoolTypes) if (school.type === b.type) score += b.points;
      score = Math.min(100, score);

      const criteria: RecCriterion[] = [
        { key: "interest", label: "Hợp sở thích (RIASEC)", weight: W.interest, points: interest, status: input.riasec ? status(interest) : "missing", value: input.riasec ? `${interest}%` : "Chưa làm", detail: interestDetail },
        { key: "fit", label: "Khả năng trúng tuyển", weight: W.fit, points: fitPts, status: fitGap ? "missing" : status(fitPts), value: fitValue, detail: fitDetail },
        {
          key: "place",
          label: "Vị trí",
          weight: W.place,
          points: placePts,
          status: home == null ? "missing" : near ? "good" : "weak",
          value: home == null ? "Chưa có" : near ? "Khớp" : "Khác vùng",
          detail: home == null ? "Hồ sơ chưa có tỉnh/thành — tạm tính 40/100." : near ? `${school.city} — cùng ${REGION_LABELS[school.region].toLowerCase()} với ${input.province}.` : `${school.city} — khác vùng với ${input.province}.`,
        },
        {
          key: "group",
          label: "Nhóm ngành quan tâm",
          weight: W.group,
          points: groupPts,
          status: input.groupIds?.length ? (inGroup ? "good" : "weak") : "missing",
          value: input.groupIds?.length ? (inGroup ? "Khớp" : "Không thuộc") : "Chưa chọn",
          detail: input.groupIds?.length ? (inGroup ? "Thuộc nhóm ngành bạn đánh dấu ở hồ sơ." : "Không thuộc nhóm ngành bạn đánh dấu.") : "Bạn chưa đánh dấu nhóm ngành quan tâm — tạm tính 30/100.",
        },
      ];

      // --- Mục tiêu
      let goalMatch: GoalMatch | null = null;
      let warning: string | null = null;
      let rank = 0;
      if (goalMajor) {
        goalMatch = major.id === goalMajor.id ? "match" : major.groupId === goalMajor.groupId ? "related" : "off";
        rank = !cfg.goalPriority ? 0 : goalMatch === "match" ? 2 : goalMatch === "related" ? 1 : 0;
        if (goalMatch === "off") {
          warning = `Lệch mục tiêu: ngành này không thuộc ${goalMajor.name}. Trovio vẫn gợi ý vì ${reasons[0] ? reasons[0].charAt(0).toLowerCase() + reasons[0].slice(1) : "phù hợp tổng thể với hồ sơ"}.`;
        }
      }

      // Phân tích rủi ro & độ tin cậy giải trình được (GIAI ĐOẠN 5):
      const cutoffsUsed = program.cutoffs;
      const dataYearsUsed = cutoffsUsed.length;
      const totalCutoffs = cutoffsUsed.length || 1;
      const estimatedCount = (cutoffsUsed.filter((c) => c.estimated).length) + (view.cutoffEstimated ? 1 : 0);
      const estimatedDataRatio = Math.round((estimatedCount / totalCutoffs) * 100) / 100;
      const officialDataRatio = Math.max(0, 1 - estimatedDataRatio);

      const scores = cutoffsUsed.map((c) => c.score).filter(Number.isFinite);
      const volatility = scores.length >= 2 ? Math.round((Math.max(...scores) - Math.min(...scores)) * 100) / 100 : 0;

      const missingDataWarnings: string[] = [];
      let calculatedConfidence = 90;

      if (dataYearsUsed < 3) {
        calculatedConfidence -= (3 - dataYearsUsed) * 25;
        missingDataWarnings.push(`Dữ liệu lịch sử chỉ có ${dataYearsUsed} năm điểm chuẩn (tiêu chuẩn khuyến nghị là 3 năm).`);
      }
      if (estimatedDataRatio > 0) {
        calculatedConfidence -= Math.round(estimatedDataRatio * 35);
        missingDataWarnings.push("Dữ liệu điểm chuẩn có chứa số liệu ước tính, chưa có xác nhận từ quyết định tuyển sinh chính thức.");
      }
      if (volatility >= 2.0) {
        calculatedConfidence -= 15;
        missingDataWarnings.push(`Điểm chuẩn dao động ${volatility} điểm qua các năm gần nhất.`);
      }
      if (!input.score) {
        calculatedConfidence -= 20;
        missingDataWarnings.push("Chưa có điểm thi thực tế của thí sinh để đối chiếu khả năng trúng tuyển.");
      }

      const confidenceScore = Math.max(10, Math.min(100, calculatedConfidence));
      const confidenceBand: "cao" | "trung-binh" | "thap" =
        confidenceScore >= 75 ? "cao" : confidenceScore >= 45 ? "trung-binh" : "thap";

      let admissionRisk: "thap" | "trung-binh" | "cao" | "chua-xac-dinh" = "chua-xac-dinh";
      let riskBand: "An toàn" | "Vừa sức" | "Thử sức" | "Chưa đủ dữ liệu" = "Chưa đủ dữ liệu";

      if (input.score && !fitGap) {
        if (fitPts >= 95) {
          admissionRisk = "thap";
          riskBand = "An toàn";
        } else if (fitPts >= 75) {
          admissionRisk = "trung-binh";
          riskBand = "Vừa sức";
        } else {
          admissionRisk = "cao";
          riskBand = "Thử sức";
        }
      }

      const disclaimer = "Kết quả gợi ý mang tính tham khảo dựa trên dữ liệu lịch sử và hồ sơ cá nhân, không cấu thành cam kết trúng tuyển.";

      scored.push({
        view,
        score,
        rank,
        reasons: reasons.slice(0, 3),
        criteria,
        budgetNote: budget != null ? `Học phí ${program.tuitionMin}–${program.tuitionMax} triệu/năm ≤ ngân sách ${budget} triệu/năm bạn đặt.` : "Bạn chưa đặt ngân sách — Trovio không lọc theo học phí.",
        goalMatch,
        warning,
        fitGap,
        history: program.cutoffs.slice(0, Math.max(3, cfg.minYears)),
        userRiasec: input.riasec ? [...input.riasec.code] : null,
        fitScore: fitPts,
        admissionRisk,
        riskBand,
        confidenceScore,
        confidenceBand,
        officialDataRatio,
        estimatedDataRatio,
        volatility,
        dataYearsUsed,
        missingDataWarnings,
        disclaimer,
      });
    }

    scored.sort((a, b) => b.rank - a.rank || b.score - a.score || (b.view.latestCutoff ?? 0) - (a.view.latestCutoff ?? 0));
    const perMajor = new Map<string, number>();
    const perSchool = new Map<string, number>();
    const items: Recommendation[] = [];
    for (const { rank: _rank, ...r } of scored) {
      const m = perMajor.get(r.view.major.id) ?? 0;
      const s = perSchool.get(r.view.school.id) ?? 0;
      const div = cfg.diversity;
      const majorCap = !div ? Infinity : goalMajor && r.view.major.id === goalMajor.id ? div.goalMajor : div.perMajor;
      if (m >= majorCap || (div && s >= div.perSchool)) continue;
      perMajor.set(r.view.major.id, m + 1);
      perSchool.set(r.view.school.id, s + 1);
      // Hiện điểm chuẩn & mức phù hợp theo phương thức của người dùng.
      if (input.score) {
        const { method, total } = input.score;
        const c = cutoffFor(r.view.program, method);
        r.view = {
          ...r.view,
          latestCutoff: c?.score ?? null,
          cutoffEstimated: !!c?.estimated,
          cutoffMethod: method,
          fit: r.fitGap ? null : computeFit(total, r.view.program, method),
        };
      } else {
        r.view = { ...r.view, fit: null };
      }
      if (r.reasons.length === 0) r.reasons.push("Phù hợp tổng thể với hồ sơ của bạn");
      items.push(r);
      if (items.length >= limit) break;
    }
    return { items, missing, goal };
  },
};
