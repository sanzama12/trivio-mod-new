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
import { admissionPolicyService, isMathOrLiterature, OFFICIAL_POLICY_2026 } from "./admission-policy.service";
import { THPT_2026_SUBJECT_IDS } from "../domain/admission-2026";

/** Cấu hình từng phương thức xét tuyển. `factor` quy đổi ngưỡng so với thang 30. */
export const ADMISSION_METHODS: Record<
  AdmissionMethodKey,
  { label: string; short: string; max: number; factor: number; decimals: number; needsCombo: boolean; inputHint: string }
> = {
  thpt: { label: "Điểm thi tốt nghiệp THPT", short: "Điểm thi THPT", max: 30, factor: 1, decimals: 2, needsCombo: true, inputHint: "Điểm thi hoặc điểm dự kiến, thang 10" },
  hocba: { label: "Xét học bạ THPT", short: "Học bạ", max: 30, factor: 1, decimals: 2, needsCombo: true, inputHint: "Điểm trung bình môn lớp 10–12, thang 10" },
};

export const METHOD_KEYS = Object.keys(ADMISSION_METHODS) as AdmissionMethodKey[];
export const isMethodKey = (v: unknown): v is AdmissionMethodKey => typeof v === "string" && Object.hasOwn(ADMISSION_METHODS, v);

/** Định dạng điểm theo thang của phương thức (thang 30). */
export function formatMethodScore(n: number | null | undefined, method: AdmissionMethodKey = "thpt"): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(ADMISSION_METHODS[method]?.decimals ?? 2);
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
export const PRIORITY_REDUCTION_THRESHOLD = OFFICIAL_POLICY_2026.priorityRules.reductionThreshold;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isValidSubjectScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
}

export function computeComboTotal(scores: Record<string, number>, combo: Combo): number | null {
  if (combo.subjects.length !== 3 || new Set(combo.subjects).size !== 3) return null;
  const values = combo.subjects.map((s) => scores[s]);
  if (!values.every(isValidSubjectScore)) return null;
  return values.reduce((a, b) => a + b, 0);
}

/** Bản tính chung dùng 3 môn đồng trọng số; mỗi tổ hợp có Toán hoặc Ngữ văn (Điều 6). */
export const isAdmissionCombo = (combo: Combo) => combo.subjects.length === 3 && new Set(combo.subjects).size === 3 && combo.subjects.some(isMathOrLiterature) && combo.subjects.every(id => THPT_2026_SUBJECT_IDS.has(id));

/** Trung bình ba điểm CẢ NĂM; không thay bằng trung bình sáu học kỳ có trọng số bằng nhau. */
export function transcriptScores(annual: Record<string, readonly number[]>): Record<string, number> {
  return Object.fromEntries(Object.entries(annual)
    .filter(([, values]) => Array.isArray(values) && values.length === 3 && values.every(isValidSubjectScore))
    .map(([id, values]) => [id, values.reduce((sum, score) => sum + score, 0) / 3]));
}

/** Điều 6.3: kiểm tra nguồn tuyển chung, không kết luận đủ điều kiện cho một trường/ngành. */
export function assess2026EntrySource(scores: Record<string, number>, combos: Combo[], graduationYear?: number, exemptionClaimed = false): {
  status: "met" | "below" | "unknown" | "not-applicable" | "exemption-review";
  rawTotal: number | null;
} {
  if (!Number.isInteger(graduationYear) || graduationYear! < 1900 || graduationYear! > 2026) return { status: "unknown", rawTotal: null };
  if (graduationYear! < 2026) return { status: "not-applicable", rawTotal: null };
  if (exemptionClaimed) return { status: "exemption-review", rawTotal: null };
  const totals = rankCombos(scores, combos).map(row => row.raw);
  if (isValidSubjectScore(scores.toan) && isValidSubjectScore(scores.van)) {
    for (const [id, score] of Object.entries(scores)) {
      if (id !== "toan" && id !== "van" && THPT_2026_SUBJECT_IDS.has(id) && isValidSubjectScore(score)) totals.push(scores.toan + scores.van + score);
    }
  }
  if (!totals.length) return { status: "unknown", rawTotal: null };
  const rawTotal = Math.max(...totals);
  return { status: rawTotal >= OFFICIAL_POLICY_2026.minimumThptScoreThreshold ? "met" : "below", rawTotal };
}

export interface ComboRank {
  code: string;
  raw: number;
}

/** Tổ hợp đủ 3 môn, mạnh → yếu theo tổng điểm. */
export function rankCombos(scores: Record<string, number>, combos: Combo[]): ComboRank[] {
  return combos
    .filter(isAdmissionCombo)
    .map((combo) => {
      const raw = computeComboTotal(scores, combo);
      return raw == null ? null : { code: combo.code, raw };
    })
    .filter((row): row is ComboRank => row != null)
    .sort((a, b) => b.raw - a.raw || a.code.localeCompare(b.code));
}

export type MethodScore = { method: AdmissionMethodKey; total: number; combo: string };

type ProfileScoreSource = Pick<ScoreProfile, "method" | "combo" | "scores" | "priorityRegion" | "priorityGroup" | "methods" | "scoresByMethod" | "combosByMethod" | "transcriptAnnualScores" | "graduationYear" | "admissionSeason"> & {
  admission: Pick<AdmissionScore, "rawTotal">;
};

export function scoresForMethod(profile: Pick<ScoreProfile, "method" | "scores" | "scoresByMethod" | "transcriptAnnualScores">, method: AdmissionMethodKey): Record<string, number> {
  if (method === "hocba" && profile.transcriptAnnualScores) return transcriptScores(profile.transcriptAnnualScores);
  return profile.scoresByMethod?.[method] ?? (profileMethod(profile) === method ? profile.scores : {});
}

function plannedMethods(profile: Pick<ScoreProfile, "method" | "methods">): AdmissionMethodKey[] {
  const listed = (profile.methods ?? []).filter(isMethodKey);
  if (listed.length) return Array.from(new Set(listed));
  return [profileMethod(profile)];
}

/** Mọi phương thức học sinh đã có điểm — dùng khi gợi ý / so khớp chương trình. */
export function methodScoresFromProfile(profile: ProfileScoreSource, combos: Combo[]): MethodScore[] {
  const out: MethodScore[] = [];
  for (const method of plannedMethods(profile)) {
    const ranked = rankCombos(scoresForMethod(profile, method), combos);
    const pinned = ranked.find((row) => row.code === (profile.combosByMethod?.[method] ?? profile.combo)) ?? ranked[0];
    if (!pinned) continue;
    out.push({
      method,
      total: computeAdmissionScore(pinned.raw, profile.priorityRegion, profile.priorityGroup, method, profile).total,
      combo: pinned.code,
    });
  }
  if (!out.length && !Object.keys(profile.scores ?? {}).length && !profile.scoresByMethod) {
    const current = profileScore(profile);
    out.push({ method: current.method, total: current.total, combo: profile.combo ?? "" });
  }
  return out;
}

/** Mọi phương thức hồ sơ khớp chương trình (mỗi phương thức một tổ hợp mạnh nhất). */
export function listScoresForProgram(
  profile: ProfileScoreSource,
  program: CutoffSource & Pick<Program, "combos">,
  combos: Combo[],
): MethodScore[] {
  const out: MethodScore[] = [];
  for (const method of plannedMethods(profile)) {
    const ranked = rankCombos(scoresForMethod(profile, method), combos);
    const cut = cutoffFor(program, method);
    if (!cut) continue;
    let total: number;
    let combo = "";
    const usable = ranked.filter((row) => program.combos.includes(row.code));
    if (!usable.length) continue;
    combo = usable[0].code;
    total = computeAdmissionScore(usable[0].raw, profile.priorityRegion, profile.priorityGroup, method, profile).total;
    if (!computeFit(total, program, method)) continue;
    out.push({ method, total, combo });
  }
  return out;
}

/** Điểm tốt nhất của hồ sơ với một chương trình: chọn phương thức + tổ hợp khớp, ưu tiên chênh lệch cao nhất. */
export function scoreForProgram(
  profile: ProfileScoreSource,
  program: CutoffSource & Pick<Program, "combos">,
  combos: Combo[],
): MethodScore | null {
  let best: MethodScore | null = null;
  let bestDiff = -Infinity;
  for (const row of listScoresForProgram(profile, program, combos)) {
    const fit = computeFit(row.total, program, row.method);
    if (!fit) continue;
    if (fit.diff > bestDiff) {
      bestDiff = fit.diff;
      best = row;
    }
  }
  return best;
}

/**
 * Công thức tham khảo khi trường công bố môn chính hệ số 2; không tự áp dụng cho mọi trường:
 * - Quy về thang 30: ((M1 + M2 + M_chính * 2) * 3) / 4
 * - Giữ thang 40: M1 + M2 + M_chính * 2
 */
export function computeWeightedComboTotal(
  scores: Record<string, number>,
  combo: Combo,
  mainSubject?: string,
  scale: 30 | 40 = 30,
): number | null {
  if (combo.subjects.length !== 3 || new Set(combo.subjects).size !== 3 || ![30, 40].includes(scale)) return null;
  if (mainSubject && !combo.subjects.includes(mainSubject)) return null;
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
  context: Pick<ScoreProfile, "admissionSeason" | "graduationYear"> = {},
): AdmissionScore {
  if (!isMethodKey(method)) throw new RangeError("Phương thức xét tuyển không hợp lệ.");
  const { max } = ADMISSION_METHODS[method];
  const priority = admissionPolicyService.computePriorityPoints(region, group, rawTotal, max, context.admissionSeason ?? 2026, context.graduationYear);
  const priorityPoints = priority.rawPriority;
  const priorityApplied = priority.appliedPriority;
  const reduced = priority.isReduced;
  return {
    rawTotal,
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
export function cutoffFor(program: CutoffSource, method: AdmissionMethodKey = "thpt"): { year: number; score: number } | null {
  if (method === "thpt") {
    const cutoff = program.cutoffs.find((item) => !item.estimated);
    return cutoff ? { year: cutoff.year, score: cutoff.score } : null;
  }
  const cutoff = program.altCutoffs?.find((item) => item.method === method && !item.estimated);
  return cutoff ? { year: cutoff.year, score: cutoff.score } : null;
}

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

type ProfileLike = Pick<ScoreProfile, "method" | "combo" | "priorityRegion" | "priorityGroup" | "graduationYear" | "admissionSeason"> & { admission: Pick<AdmissionScore, "rawTotal"> };

/** Điểm xét tuyển hiện hành của hồ sơ (tính lại theo quy chế, cộng thêm `delta` khi mô phỏng). */
export function profileScore(profile: ProfileLike, delta = 0): { method: AdmissionMethodKey; total: number } {
  const method = profileMethod(profile);
  const max = ADMISSION_METHODS[method].max;
  const raw = Math.max(0, Math.min(max, profile.admission.rawTotal + delta));
  return { method, total: computeAdmissionScore(raw, profile.priorityRegion, profile.priorityGroup, method, profile).total };
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
