/**
 * SERVICE LAYER — gợi ý "Dành cho bạn": kết hợp sở thích (RIASEC), điểm & phương thức, tỉnh/thành, ngân sách.
 * Minh bạch: mỗi gợi ý kèm lý do + bảng tiêu chí (màn "Vì sao Trovio gợi ý?"); trọng số mô tả ở /cach-goi-y.
 * Không dùng ngày sinh, cung hoàng đạo hay thần số học.
 */
import type { AdmissionMethodKey, CutoffScore, Major, Program, RiasecResult, RiasecType, Region } from "../domain/types";
import { regionOfProvince } from "../domain/provinces";
import { RIASEC_INFO } from "../domain/riasec";
import { REGION_LABELS } from "./program.filters";
import { programService, type ProgramView } from "./program.service";
import { matchMajor } from "./riasec.service";
import { ADMISSION_METHODS, computeFit, cutoffFor, FIT_LABELS, formatMethodScore, type FitInfo, type MethodScore } from "./scoring.service";
import { repositories } from "@database/repositories";
import { formatTuition, hasTuitionData } from "../lib/format";
import { effectiveRecommendConfig, type EffectiveRecommendConfig } from "./rules.service";

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
  /** Mọi phương thức đã có điểm (ĐGNL cạnh THPT). Thiếu thì dùng `score`. */
  methodScores?: MethodScore[];
  /** Tổng xét tuyển từng tổ hợp đủ 3 môn (đã cộng ưu tiên). */
  comboScores?: { code: string; total: number }[];
  budgetMax?: number | null;
  regions?: Region[];
  groupIds?: string[];
  interestMajorIds?: string[];
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
  /** Điểm thành phần 0–100; null khi thiếu dữ liệu và bị loại khỏi phép tính. */
  points: number | null;
  /** Trọng số thực tế sau khi phân bổ lại trên các tiêu chí có dữ liệu. */
  effectiveWeight: number;
  status: "good" | "ok" | "weak" | "missing";
  /** Nhãn ngắn hiển thị cạnh tiêu chí (VD "77%", "Vừa sức"). */
  value: string;
  detail: string;
}

export type GoalMatch = "match" | "related" | "off";

/** Vì sao chưa gắn nhãn khả năng: chưa có điểm, hoặc chương trình có < 3 năm điểm chuẩn. */
export type FitGap = "no-score" | "few-years" | null;

/** Một phương thức xét của chương trình, kèm điểm học sinh nếu có. */
export interface RecMethodFit {
  method: AdmissionMethodKey;
  combo?: string;
  userTotal: number | null;
  cutoff: number;
  year: number;
  fit: FitInfo | null;
}

export interface Recommendation {
  view: ProgramView;
  score: number;
  reasons: string[];
  criteria: RecCriterion[];
  /** Mọi phương thức xét có điểm chuẩn — không chỉ phương thức tốt nhất. */
  methodFits: RecMethodFit[];
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
  fitScore: number | null;
  admissionRisk: "thap" | "trung-binh" | "cao" | "chua-xac-dinh";
  riskBand: "An toàn" | "Vừa sức" | "Thử sức" | "Chưa đủ dữ liệu";
  confidenceScore: number;
  confidenceBand: "cao" | "trung-binh" | "thap";
  /** Tỷ lệ trọng số tiêu chí thực sự có dữ liệu (0–1). */
  dataCoverage: number;
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

function methodList(input: RecommendInput): MethodScore[] {
  if (input.methodScores?.length) return input.methodScores;
  return input.score ? [input.score] : [];
}

type ProgramScoreSource = Pick<Program, "combos" | "cutoffs"> & Partial<Pick<Program, "altCutoffs" | "methods">>;

function programMethodKeys(program: ProgramScoreSource): AdmissionMethodKey[] {
  const keys: AdmissionMethodKey[] = [];
  const add = (k: AdmissionMethodKey) => {
    if (!keys.includes(k)) keys.push(k);
  };
  if (program.cutoffs.length) add("thpt");
  for (const a of program.altCutoffs ?? []) add(a.method);
  for (const m of program.methods ?? []) {
    if (m.key && m.key in ADMISSION_METHODS) add(m.key);
  }
  return keys;
}

function scoreRowsForProgram(input: RecommendInput, program: ProgramScoreSource): MethodScore[] {
  const rows: MethodScore[] = [];
  for (const ms of methodList(input)) {
    const cut = cutoffFor(program, ms.method);
    if (!cut) continue;
    let total = ms.total;
    let combo = ms.combo;
    if (ADMISSION_METHODS[ms.method].needsCombo) {
      const usable = (input.comboScores ?? []).filter((row) => program.combos.includes(row.code)).sort((a, b) => b.total - a.total);
      if (usable.length) {
        total = usable[0].total;
        combo = usable[0].code;
      } else if (combo && !program.combos.includes(combo)) continue;
      else if (!combo) continue;
    }
    rows.push({ method: ms.method, total, combo });
  }
  return rows;
}

/** Chọn phương thức + tổ hợp khớp chương trình, ưu tiên chênh lệch điểm cao nhất. */
function pickScoreForProgram(input: RecommendInput, program: ProgramScoreSource): MethodScore | null {
  let best: MethodScore | null = null;
  let bestDiff = -Infinity;
  for (const row of scoreRowsForProgram(input, program)) {
    const cut = cutoffFor(program, row.method);
    if (!cut) continue;
    const diff = row.total - cut.score;
    if (diff > bestDiff) {
      bestDiff = diff;
      best = row;
    }
  }
  return best;
}

function methodFitsForProgram(input: RecommendInput, program: ProgramScoreSource, minYears: number): RecMethodFit[] {
  const scored = new Map<AdmissionMethodKey, MethodScore>();
  for (const row of scoreRowsForProgram(input, program)) scored.set(row.method, row);
  const fits: RecMethodFit[] = [];
  for (const method of programMethodKeys(program)) {
    const cut = cutoffFor(program, method);
    if (!cut) continue;
    const row = scored.get(method);
    const few = method === "thpt" && program.cutoffs.length < minYears;
    fits.push({
      method,
      combo: row?.combo || undefined,
      userTotal: row?.total ?? null,
      cutoff: cut.score,
      year: cut.year,
      fit: row && !few ? computeFit(row.total, program, method) : null,
    });
  }
  fits.sort((a, b) => (b.fit?.diff ?? -Infinity) - (a.fit?.diff ?? -Infinity));
  return fits;
}

export const recommendationService = {
  /** Trả về tối đa `limit` chương trình, đa dạng (≤ 2 cùng ngành — ngành mục tiêu ≤ 3, ≤ 2 cùng trường). */
  async recommend(
    input: RecommendInput,
    limit = 6,
    /** Cấu hình thay thế (trang Quy tắc gợi ý chạy thử trước khi lưu). */
    configOverride?: EffectiveRecommendConfig,
  ): Promise<{ items: Recommendation[]; missing: ("quiz" | "score")[]; goal: GoalSummary | null }> {
    const cfg = configOverride ?? (await effectiveRecommendConfig());
    const W = input.focus && FOCUS_WEIGHTS[input.focus] ? FOCUS_WEIGHTS[input.focus] : cfg.weights;
    const missing: ("quiz" | "score")[] = [];
    if (!input.riasec) missing.push("quiz");
    if (!methodList(input).length) missing.push("score");

    const goalMajor = input.goalMajorId ? await repositories.majors.findById(input.goalMajorId) : null;
    const goal: GoalSummary | null = goalMajor
      ? { majorId: goalMajor.id, majorName: goalMajor.name, majorRiasec: goalMajor.riasec, ...goalWarning(input.riasec, goalMajor) }
      : null;

    if (!input.riasec && !methodList(input).length && !input.groupIds?.length && !input.interestMajorIds?.length && !goalMajor) return { items: [], missing, goal };

    const home = regionOfProvince(input.province);
    const all = await programService.listAll();
    const scored: (Recommendation & { rank: number; chosen: MethodScore | null })[] = [];
    const budget = input.budgetMax != null && Number.isFinite(input.budgetMax) ? input.budgetMax : null;

    for (const view of all) {
      const { program, school, major } = view;
      const reasons: string[] = [];

      // Loại: vượt ngân sách, không xét phương thức/tổ hợp, ngoài khu vực đã chọn.
      if (budget != null && cfg.budgetTolerance != null && program.tuitionMin > budget * (1 + cfg.budgetTolerance / 100)) continue;
      if (input.regions?.length && !input.regions.includes(school.region)) continue;

      // --- Khả năng trúng tuyển. Thiếu dữ liệu không được gán điểm thay thế.
      const methodFits = methodFitsForProgram(input, program, cfg.minYears);
      const chosen = pickScoreForProgram(input, program);
      let fitPts: number | null = null;
      let fitGap: FitGap = methodList(input).length ? null : "no-score";
      let fitValue = "Chưa đủ dữ liệu";
      let fitDetail = "Chưa có điểm của bạn — tiêu chí này không tham gia tính điểm gợi ý.";
      if (methodList(input).length) {
        if (!chosen) continue;
        const { method, total, combo } = chosen;
        const cut = cutoffFor(program, method)!;
        const unit = ADMISSION_METHODS[method].short;
        const trustedYears = program.cutoffs.filter((item) => !item.estimated).length;
        if (method === "thpt" && trustedYears < cfg.minYears) {
          fitGap = "few-years";
          fitDetail = `Chương trình mới có ${trustedYears} năm điểm chuẩn có thể sử dụng — tiêu chí này không tham gia tính điểm cho tới khi đủ ${cfg.minYears} năm.`;
        } else {
          const fit = computeFit(total, program, method)!;
          fitPts = FIT_POINTS[fit.level];
          fitValue = fit.label;
          const d = ADMISSION_METHODS[method].decimals;
          fitDetail =
            `${formatMethodScore(total, method)} điểm ${unit}${combo ? ` · ${combo}` : ""}, ${fit.diff >= 0 ? "cao" : "thấp"} hơn chuẩn ${cut.year} (${formatMethodScore(cut.score, method)}) ` +
            `${Math.abs(fit.diff).toFixed(d)} điểm → ${fit.label}.` +
            (fit.level === "vua-suc" ? " Chưa tới +1 điểm nên chưa phải An toàn." : fit.level === "thu-suc" ? " Nên xếp sau ít nhất một nguyện vọng An toàn." : "");
          if (fit.level !== "thu-suc") {
            reasons.push(`${FIT_LABELS[fit.level]} với ${formatMethodScore(total, method)} điểm ${unit}${combo ? ` · ${combo}` : ""} (chuẩn ${cut.year}: ${formatMethodScore(cut.score, method)})`);
          }
        }
      }

      // --- Sở thích RIASEC chỉ phản ánh sở thích nghề nghiệp, không phải năng lực.
      let interest: number | null = null;
      let interestDetail = "Chưa làm trắc nghiệm sở thích — tiêu chí này không tham gia tính điểm gợi ý.";
      if (input.riasec) {
        interest = matchMajor(input.riasec, major);
        const shared = major.riasec.filter((t) => input.riasec!.code.includes(t));
        interestDetail = `Mã của bạn ${input.riasec.code.join("-")} · ngành cần ${major.riasec.join("-")} → chung ${shared.length}/3 nhóm chính${shared.length ? ` (${riasecLabels(shared)})` : ""}.`;
        if (interest >= 60 && shared.length) reasons.unshift(`Hợp sở thích ${riasecLabels(shared)} (${interest}% phù hợp)`);
      }

      // --- Ngành quan tâm & vị trí
      const inGoal = goalMajor?.id === major.id;
      const inMajor = inGoal || !!input.interestMajorIds?.includes(major.id);
      const inGroup = !!input.groupIds?.includes(major.groupId) || (!!goalMajor && goalMajor.groupId === major.groupId);
      const hasInterestPreference = !!goalMajor || !!input.interestMajorIds?.length || !!input.groupIds?.length;
      if (inMajor) reasons.push(inGoal ? "Đúng ngành mục tiêu của bạn" : "Ngành bạn đánh dấu quan tâm");
      else if (inGroup) reasons.push("Thuộc nhóm ngành bạn quan tâm");

      const near = home != null && school.region === home;
      const selectedRegion = !!input.regions?.length && input.regions.includes(school.region);
      const hasPlacePreference = home != null || !!input.regions?.length;
      const placeMatches = near || selectedRegion;
      if (near) reasons.push(`Cùng ${REGION_LABELS[school.region].toLowerCase()} với ${input.province}`);
      else if (selectedRegion) reasons.push(`Thuộc khu vực ${REGION_LABELS[school.region]} bạn đã chọn`);
      if (budget != null && hasTuitionData(program.tuitionMin, program.tuitionMax)) reasons.push(`Học phí trong ngân sách ${budget} triệu/năm`);

      const placePts = hasPlacePreference ? (placeMatches ? 100 : 40) : null;
      const groupPts = hasInterestPreference ? (inMajor ? 100 : inGroup ? 90 : 30) : null;
      const rawCriteria: Omit<RecCriterion, "effectiveWeight">[] = [
        { key: "interest", label: "Hợp sở thích (RIASEC)", weight: W.interest, points: interest, status: interest == null ? "missing" : status(interest), value: interest == null ? "Chưa làm" : `${interest}%`, detail: interestDetail },
        { key: "fit", label: "Mức phù hợp điểm xét tuyển", weight: W.fit, points: fitPts, status: fitPts == null ? "missing" : status(fitPts), value: fitValue, detail: fitDetail },
        {
          key: "place",
          label: "Vị trí",
          weight: W.place,
          points: placePts,
          status: placePts == null ? "missing" : placeMatches ? "good" : "weak",
          value: placePts == null ? "Chưa chọn" : placeMatches ? "Khớp" : "Khác khu vực",
          detail: placePts == null ? "Bạn chưa chọn tỉnh/thành hoặc khu vực — tiêu chí này không tham gia tính điểm gợi ý." : near ? `${school.city} — cùng ${REGION_LABELS[school.region].toLowerCase()} với ${input.province}.` : selectedRegion ? `${school.city} — thuộc khu vực bạn đã chọn.` : `${school.city} — khác khu vực ưu tiên của bạn.`,
        },
        {
          key: "group",
          label: "Ngành quan tâm",
          weight: W.group,
          points: groupPts,
          status: groupPts == null ? "missing" : inMajor || inGroup ? "good" : "weak",
          value: groupPts == null ? "Chưa chọn" : inMajor ? "Ngành khớp" : inGroup ? "Nhóm khớp" : "Không thuộc",
          detail: inMajor
            ? inGoal ? "Đúng ngành mục tiêu bạn đã chọn." : "Đúng ngành bạn đánh dấu quan tâm."
            : hasInterestPreference
              ? inGroup ? "Thuộc nhóm ngành bạn quan tâm." : "Không thuộc ngành hoặc nhóm ngành bạn đã chọn."
              : "Bạn chưa chọn ngành quan tâm — tiêu chí này không tham gia tính điểm gợi ý.",
        },
      ];
      const availableWeight = rawCriteria.reduce((sum, item) => sum + (item.points == null ? 0 : item.weight), 0);
      const criteria: RecCriterion[] = rawCriteria.map((item) => ({
        ...item,
        effectiveWeight: item.points == null || availableWeight === 0 ? 0 : item.weight / availableWeight,
      }));
      let score = availableWeight === 0
        ? 0
        : Math.round(criteria.reduce((sum, item) => sum + (item.points == null ? 0 : item.points * item.effectiveWeight), 0));

      // Quy tắc cộng điểm chỉ chạy khi tiêu chí điểm xét tuyển có dữ liệu.
      if (cfg.boostCutoff && chosen && fitPts != null) {
        const cut = cutoffFor(program, chosen.method);
        if (cut && Math.abs(chosen.total - cut.score) / ADMISSION_METHODS[chosen.method].factor <= cfg.boostCutoff.gap) score += cfg.boostCutoff.points;
      }
      for (const b of cfg.boostSchoolTypes) if (school.type === b.type) score += b.points;
      score = Math.min(100, score);
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

      // Độ tin cậy phản ánh độ phủ dữ liệu, số năm lịch sử và khả năng truy nguồn.
      const cutoffsUsed = program.cutoffs.filter((item) => !item.estimated);
      const dataYearsUsed = cutoffsUsed.length;
      const scores = cutoffsUsed.map((c) => c.score).filter(Number.isFinite);
      const volatility = scores.length >= 2 ? Math.round((Math.max(...scores) - Math.min(...scores)) * 100) / 100 : 0;
      const dataCoverage = Math.round(availableWeight * 100) / 100;
      const hasSource = !!program.sourceUrl || /^https?:\/\//i.test(program.source || "");

      const missingDataWarnings: string[] = [];
      if (dataYearsUsed < cfg.minYears) missingDataWarnings.push(`Chỉ có ${dataYearsUsed} năm điểm chuẩn có thể sử dụng; cần ${cfg.minYears} năm để gắn nhãn mức phù hợp.`);
      if (!hasSource) missingDataWarnings.push("Chưa có liên kết nguồn cho dữ liệu tuyển sinh của chương trình.");
      if (volatility >= 2) missingDataWarnings.push(`Điểm chuẩn dao động ${volatility} điểm trong lịch sử đang có.`);
      if (!methodList(input).length) missingDataWarnings.push("Chưa có điểm xét tuyển của bạn để đối chiếu.");
      if (!hasTuitionData(program.tuitionMin, program.tuitionMax)) missingDataWarnings.push("Chưa có dữ liệu học phí; tiêu chí ngân sách không được sử dụng.");

      const profileCoverage = dataCoverage * 50;
      const historyCoverage = Math.min(1, dataYearsUsed / Math.max(1, cfg.minYears)) * 30;
      const sourceCoverage = hasSource ? 20 : 0;
      const volatilityPenalty = volatility >= 2 ? 10 : 0;
      const confidenceScore = Math.max(0, Math.min(100, Math.round(profileCoverage + historyCoverage + sourceCoverage - volatilityPenalty)));
      const confidenceBand: "cao" | "trung-binh" | "thap" =
        confidenceScore >= 75 ? "cao" : confidenceScore >= 45 ? "trung-binh" : "thap";
      let admissionRisk: "thap" | "trung-binh" | "cao" | "chua-xac-dinh" = "chua-xac-dinh";
      let riskBand: "An toàn" | "Vừa sức" | "Thử sức" | "Chưa đủ dữ liệu" = "Chưa đủ dữ liệu";

      if (fitPts != null && chosen && !fitGap) {
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
        chosen,
        reasons: reasons.slice(0, 3),
        criteria,
        methodFits,
        budgetNote: !hasTuitionData(program.tuitionMin, program.tuitionMax)
          ? "Chưa có dữ liệu học phí — Trovio không dùng tiêu chí ngân sách cho chương trình này."
          : budget != null
            ? `${formatTuition(program.tuitionMin, program.tuitionMax)} ≤ ngân sách ${budget} triệu/năm bạn đặt.`
            : "Bạn chưa đặt ngân sách — Trovio không lọc theo học phí.",
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
        dataCoverage,
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
    for (const { rank: _rank, chosen, ...r } of scored) {
      const m = perMajor.get(r.view.major.id) ?? 0;
      const s = perSchool.get(r.view.school.id) ?? 0;
      const div = cfg.diversity;
      const majorCap = !div ? Infinity : goalMajor && r.view.major.id === goalMajor.id ? div.goalMajor : div.perMajor;
      if (m >= majorCap || (div && s >= div.perSchool)) continue;
      perMajor.set(r.view.major.id, m + 1);
      perSchool.set(r.view.school.id, s + 1);
      if (chosen) {
        const { method, total } = chosen;
        const c = cutoffFor(r.view.program, method);
        r.view = {
          ...r.view,
          latestCutoff: c?.score ?? null,
          cutoffMethod: method,
          cutoffCombo: chosen.combo || undefined,
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
