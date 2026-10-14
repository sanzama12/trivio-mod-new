/**
 * SERVICE LAYER — tính điểm xét tuyển.
 * Hàm thuần, không phụ thuộc framework, dễ viết unit test.
 */
import type {
  AdmissionMethodKey,
  AdmissionScore,
  Combo,
  FitLevel,
  PriorityGroup,
  PriorityRegion,
  Program,
  ScoreProfile,
} from "../domain/types";


/** Cấu hình từng phương thức xét tuyển. `factor` quy đổi ngưỡng so với thang 30. */
export const ADMISSION_METHODS: Record<
  AdmissionMethodKey,
  { label: string; short: string; max: number; factor: number; decimals: number; needsCombo: boolean; inputHint: string }
> = {
  thpt: { label: "Điểm thi tốt nghiệp THPT", short: "Điểm thi THPT", max: 30, factor: 1, decimals: 2, needsCombo: true, inputHint: "Điểm thi hoặc điểm dự kiến, thang 10" },
  hocba: { label: "Xét học bạ THPT", short: "Học bạ", max: 30, factor: 1, decimals: 2, needsCombo: true, inputHint: "Điểm trung bình môn lớp 10–12, thang 10" },
  "dgnl-hn": { label: "Đánh giá năng lực ĐHQG Hà Nội (HSA)", short: "ĐGNL HN", max: 150, factor: 5, decimals: 0, needsCombo: false, inputHint: "Điểm bài thi HSA, thang 150" },
  "dgnl-hcm": { label: "Đánh giá năng lực ĐHQG TP.HCM", short: "ĐGNL HCM", max: 1200, factor: 40, decimals: 0, needsCombo: false, inputHint: "Điểm bài thi, thang 1200" },
  tsa: { label: "Đánh giá tư duy ĐH Bách Khoa Hà Nội (TSA)", short: "ĐGTD TSA", max: 100, factor: 100 / 30, decimals: 2, needsCombo: false, inputHint: "Điểm bài thi TSA, thang 100" },
};

export const METHOD_KEYS = Object.keys(ADMISSION_METHODS) as AdmissionMethodKey[];
export const isMethodKey = (v: unknown): v is AdmissionMethodKey => typeof v === "string" && v in ADMISSION_METHODS;

/** Bảng quy đổi chứng chỉ IELTS sang điểm môn Ngoại ngữ theo chuẩn xét tuyển ĐH. */
export const IELTS_CONVERSION_TABLE: Record<string, number> = {
  "4.0": 7.0,
  "4.5": 7.5,
  "5.0": 8.0,
  "5.5": 8.5,
  "6.0": 9.0,
  "6.5": 9.5,
  "7.0": 10.0,
  "7.5": 10.0,
  "8.0": 10.0,
  "8.5": 10.0,
  "9.0": 10.0,
};

/** Bảng quy đổi TOEFL iBT sang điểm môn Ngoại ngữ. */
export const TOEFL_IBT_CONVERSION_TABLE: Record<number, number> = {
  40: 7.0,
  45: 8.0,
  60: 8.5,
  70: 9.0,
  80: 9.5,
  90: 10.0,
};

export function convertIeltsToSubjectScore(ieltsScore: number | string): number {
  const key = typeof ieltsScore === "number" ? ieltsScore.toFixed(1) : String(ieltsScore).trim();
  const num = parseFloat(key);
  if (num >= 7.0) return 10.0;
  return IELTS_CONVERSION_TABLE[key] ?? (num >= 4.0 ? 7.0 : 0);
}

/** Định dạng điểm theo thang của phương thức (ĐGNL không có phần thập phân). */
export function formatMethodScore(n: number | null | undefined, method: AdmissionMethodKey = "thpt"): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(ADMISSION_METHODS[method].decimals);
}

export const PRIORITY_REGION_POINTS: Record<PriorityRegion, number> = {
  KV1: 0.75,
  "KV2-NT": 0.5,
  KV2: 0.25,
  KV3: 0,
};

export const PRIORITY_GROUP_POINTS: Record<PriorityGroup, number> = {
  none: 0,
  UT1: 2,
  UT2: 1,
};

export const PRIORITY_REGION_LABELS: Record<PriorityRegion, string> = {
  KV1: "KV1 (+0.75)",
  "KV2-NT": "KV2-NT (+0.5)",
  KV2: "KV2 (+0.25)",
  KV3: "KV3 (+0)",
};

export const PRIORITY_GROUP_LABELS: Record<PriorityGroup, string> = {
  none: "Không thuộc đối tượng ưu tiên",
  UT1: "Nhóm UT1 – đối tượng 01–03 (+2.0)",
  UT2: "Nhóm UT2 – đối tượng 04–06 (+1.0)",
};

/** Ngưỡng từ đó điểm ưu tiên bị giảm dần (quy chế tuyển sinh từ 2023). */
export const PRIORITY_REDUCTION_THRESHOLD = 22.5;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isValidSubjectScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
}

export function computeComboTotal(scores: Record<string, number>, combo: Combo): number | null {
  const values = combo.subjects.map((s) => scores[s]);
  if (!values.every(isValidSubjectScore)) return null;
  return round2(values.reduce((a, b) => a + b, 0));
}

/**
 * Tính tổng điểm tổ hợp có môn chính nhân hệ số 2 theo chuẩn Bộ GD&ĐT:
 * - Quy về thang 30: ((M1 + M2 + M_chính * 2) * 3) / 4
 * - Giữ thang 40: M1 + M2 + M_chính * 2
 */
export function computeWeightedComboTotal(
  scores: Record<string, number>,
  combo: Combo,
  mainSubject?: string,
  scale: 30 | 40 = 30,
): number | null {
  const values = combo.subjects.map((s) => scores[s]);
  if (!values.every(isValidSubjectScore)) return null;
  if (!mainSubject || !combo.subjects.includes(mainSubject)) {
    return round2(values.reduce((a, b) => a + b, 0));
  }
  const mainScore = scores[mainSubject];
  const sumWithMainX2 = values.reduce((a, b) => a + b, 0) + mainScore;
  if (scale === 40) {
    return round2(sumWithMainX2);
  }
  return round2((sumWithMainX2 * 3) / 4);
}

export interface TieBreakerCriteria {
  mainSubject?: string;
  minMainScore?: number;
  preferredWishOrder?: number;
}

/** Đánh giá tiêu chí phụ khi bằng điểm chuẩn ở ngưỡng cuối. */
export function evaluateTieBreaker(
  scores: Record<string, number>,
  wishOrder: number,
  criteria: TieBreakerCriteria,
): { passed: boolean; reason: string } {
  if (criteria.mainSubject && criteria.minMainScore != null) {
    const userMain = scores[criteria.mainSubject] ?? 0;
    if (userMain < criteria.minMainScore) {
      return {
        passed: false,
        reason: `Điểm môn tiêu chí phụ (${criteria.mainSubject}) đạt ${userMain} < ngưỡng yêu cầu ${criteria.minMainScore}`,
      };
    }
  }
  if (criteria.preferredWishOrder != null && wishOrder > criteria.preferredWishOrder) {
    return {
      passed: false,
      reason: `Tiêu chí phụ yêu cầu nguyện vọng <= ${criteria.preferredWishOrder} (bạn đang đặt ở NV${wishOrder})`,
    };
  }
  return { passed: true, reason: "Thỏa mãn đầy đủ các tiêu chí phụ xét tuyển" };
}

/**
 * Điểm xét tuyển = tổng 3 môn + điểm ưu tiên.
 * Nếu tổng 3 môn ≥ 22.5: điểm ưu tiên = [(30 − tổng) / 7.5] × mức ưu tiên.
 * Với thang điểm khác (ĐGNL), điểm ưu tiên và ngưỡng 22.5 được quy đổi tương ứng theo tỉ lệ thang/30.
 */
export function computeAdmissionScore(
  rawTotal: number,
  region: PriorityRegion,
  group: PriorityGroup,
  method: AdmissionMethodKey = "thpt",
): AdmissionScore {
  const { max, factor } = ADMISSION_METHODS[method];
  const priorityPoints = round2((PRIORITY_REGION_POINTS[region] + PRIORITY_GROUP_POINTS[group]) * factor);
  const threshold = PRIORITY_REDUCTION_THRESHOLD * factor;
  const reduced = rawTotal >= threshold;
  const priorityApplied = round2(reduced ? ((max - rawTotal) / (max - threshold)) * priorityPoints : priorityPoints);
  return {
    rawTotal: round2(rawTotal),
    priorityPoints,
    priorityApplied,
    total: round2(Math.min(max, rawTotal + priorityApplied)),
    reduced,
  };
}

export interface FitInfo {
  level: FitLevel;
  label: string;
  diff: number;
  hint: string;
}

export const FIT_LABELS: Record<FitLevel, string> = {
  "an-toan": "An toàn",
  "vua-suc": "Vừa sức",
  "thu-suc": "Thử sức",
};

type CutoffSource = Pick<Program, "cutoffs"> & Partial<Pick<Program, "altCutoffs">>;

/** Điểm chuẩn gần nhất của chương trình theo phương thức (null nếu không xét phương thức đó). */
export function cutoffFor(program: CutoffSource, method: AdmissionMethodKey = "thpt"): { year: number; score: number; estimated?: boolean } | null {
  if (method === "thpt") return program.cutoffs[0] ?? null;
  const c = program.altCutoffs?.find((x) => x.method === method);
  return c ? { year: c.year, score: c.score, ...(c.estimated ? { estimated: true } : {}) } : null;
}

/** Nhãn dùng chung cho điểm chuẩn ƯỚC TÍNH (chưa phải điểm trường công bố). */
export const ESTIMATED_LABEL = "Ước tính";
export const ESTIMATED_HINT = "Số ước tính suy ra từ điểm thi THPT để minh hoạ — chưa phải điểm chuẩn trường công bố. Đừng dùng để đặt nguyện vọng.";

export const acceptsMethod = (program: CutoffSource, method: AdmissionMethodKey) => cutoffFor(program, method) != null;

/** Ngưỡng (theo thang 30): ≥ +1 an toàn, ≥ −0.5 vừa sức, còn lại thử sức. Quy đổi theo thang của phương thức. */
export const FIT_THRESHOLDS = { safe: 1, reach: -0.5 } as const;

export function fitLevelOf(diff: number, method: AdmissionMethodKey = "thpt"): FitLevel {
  const f = ADMISSION_METHODS[method].factor;
  return diff >= FIT_THRESHOLDS.safe * f ? "an-toan" : diff >= FIT_THRESHOLDS.reach * f ? "vua-suc" : "thu-suc";
}

/** So sánh điểm xét tuyển của học sinh với điểm chuẩn gần nhất (theo phương thức, mặc định điểm thi THPT). */
export function computeFit(userScore: number | null | undefined, program: CutoffSource, method: AdmissionMethodKey = "thpt"): FitInfo | null {
  if (userScore == null || !Number.isFinite(userScore)) return null;
  const cut = cutoffFor(program, method);
  if (!cut) return null;
  const d = ADMISSION_METHODS[method].decimals;
  const diff = round2(userScore - cut.score);
  const level = fitLevelOf(diff, method);
  const unit = ADMISSION_METHODS[method].short;
  const hint =
    level === "an-toan"
      ? `Cao hơn điểm chuẩn ${cut.year} ${diff.toFixed(d)} điểm (${unit}).`
      : level === "vua-suc"
        ? `Sát điểm chuẩn ${cut.year} (${diff >= 0 ? "+" : ""}${diff.toFixed(d)} điểm, ${unit}).`
        : `Thấp hơn điểm chuẩn ${cut.year} ${Math.abs(diff).toFixed(d)} điểm (${unit}).`;
  return { level, label: FIT_LABELS[level], diff, hint };
}

/** Phương thức của hồ sơ điểm (hồ sơ cũ không có trường này = điểm thi THPT). */
export const profileMethod = (p: Pick<ScoreProfile, "method"> | null | undefined): AdmissionMethodKey =>
  p?.method && isMethodKey(p.method) ? p.method : "thpt";

type ProfileLike = Pick<ScoreProfile, "method" | "combo" | "priorityRegion" | "priorityGroup"> & { admission: Pick<AdmissionScore, "rawTotal"> };

/** Điểm xét tuyển hiện hành của hồ sơ (tính lại theo quy chế, cộng thêm `delta` khi mô phỏng). */
export function profileScore(profile: ProfileLike, delta = 0): { method: AdmissionMethodKey; total: number } {
  const method = profileMethod(profile);
  const max = ADMISSION_METHODS[method].max;
  const raw = Math.max(0, Math.min(max, profile.admission.rawTotal + delta));
  return { method, total: computeAdmissionScore(raw, profile.priorityRegion, profile.priorityGroup, method).total };
}

export type FitResult =
  | { fit: FitInfo; reason: null }
  | { fit: null; reason: "combo" | "method" };

/**
 * Mức phù hợp của một chương trình với hồ sơ điểm đã lưu:
 * - không xét phương thức của hồ sơ → reason "method";
 * - THPT/học bạ mà không xét tổ hợp của hồ sơ → reason "combo".
 */
export function fitForProfile(profile: ProfileLike, program: CutoffSource & Pick<Program, "combos">, delta = 0): FitResult {
  const { method, total } = profileScore(profile, delta);
  if (!acceptsMethod(program, method)) return { fit: null, reason: "method" };
  if (ADMISSION_METHODS[method].needsCombo && !program.combos.includes(profile.combo)) return { fit: null, reason: "combo" };
  return { fit: computeFit(total, program, method)!, reason: null };
}

/** Cần thêm bao nhiêu điểm để lên mức an toàn (0 nếu đã an toàn). */
export function pointsToSafe(userScore: number, program: CutoffSource, method: AdmissionMethodKey = "thpt"): number | null {
  const cut = cutoffFor(program, method);
  if (!cut) return null;
  return Math.max(0, round2(cut.score + FIT_THRESHOLDS.safe * ADMISSION_METHODS[method].factor - userScore));
}
