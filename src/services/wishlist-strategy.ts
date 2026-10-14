/**
 * SERVICE LAYER (thuần, dùng được cả ở client) — kiểm tra chiến lược danh sách nguyện vọng.
 *
 * Nguyên tắc quy chế tuyển sinh Bộ GD&ĐT:
 * 1. Thí sinh đăng ký theo mức độ MONG MUỐN THẬT SỰ (nguyện vọng 1 là ngành/trường thí sinh muốn học nhất).
 * 2. Hệ thống tuyển sinh xét công bằng: thí sinh trúng tuyển nguyện vọng cao nhất mà mình đủ điều kiện.
 * 3. Nếu thí sinh yêu thích một ngành có điểm chuẩn thấp hơn và đặt ở NV1, trúng tuyển NV1 là mục tiêu của thí sinh.
 *    Nếu chẳng may trượt NV1, các nguyện vọng sau (dù có điểm chuẩn tham khảo cao hơn) VẪN ĐƯỢC XÉT bình thường
 *    nếu thí sinh đủ điều kiện.
 * 4. Hệ thống Trovio cung cấp cảnh báo chiến lược để thí sinh tham khảo, TUYỆT ĐỐI không áp đặt hoặc tự ý
 *    cưỡng bức đảo lộn thứ tự mong muốn thật của thí sinh.
 * 5. Tuân thủ giới hạn tối đa 15 nguyện vọng và quy định riêng cho ngành đào tạo giáo viên (NV1–5).
 */
import type { FitLevel, Program, ScoreProfile, AdmissionScore } from "../domain/types";
import { ADMISSION_METHODS, FIT_LABELS, fitForProfile, profileMethod, type FitResult } from "./scoring.service";
import { admissionPolicyService } from "./admission-policy.service";

export type CheckLevel = "danger" | "warning" | "info" | "ok";

export interface StrategyItem {
  id: string;
  label: string; // "Marketing – NEU"
  program: Pick<Program, "id" | "name" | "cutoffs" | "altCutoffs" | "combos" | "tuitionMin" | "tuitionMax" | "majorId"> & {
    schoolId?: string;
  };
}

export interface StrategyCheck {
  id: string;
  level: CheckLevel;
  title: string;
  detail: string;
  programIds?: string[];
}

export interface EvaluatedWishItem {
  id: string;
  label: string;
  /** Thứ tự ưu tiên mong muốn thật của thí sinh (1-based: 1, 2, 3...) */
  preferenceRank: number;
  /** Mức đánh giá khả năng trúng tuyển dựa trên dữ liệu tham khảo */
  riskBand: FitLevel | "unknown";
  /** Đủ điều kiện xét tuyển hay không */
  eligibility: {
    isEligible: boolean;
    reason?: "combo" | "method" | "quota" | "tuition" | "teacher-training-rank" | "score-threshold";
    message?: string;
  };
  /** Độ tin cậy dữ liệu của chương trình này */
  confidence: "high" | "medium" | "low";
  /** Các cảnh báo riêng cho nguyện vọng này */
  strategyWarnings: string[];
}

export interface StrategyReport {
  status: CheckLevel | "incomplete";
  checks: StrategyCheck[];
  counts: Record<FitLevel | "unknown", number>;
  /** Mức của từng nguyện vọng theo thứ tự danh sách (null = không xét được). */
  results: FitResult[];
  /** Danh sách chi tiết từng nguyện vọng đã bóc tách rõ preferenceRank, riskBand, eligibility, confidence */
  evaluatedItems: EvaluatedWishItem[];
  /** Thứ tự tham khảo nếu xếp theo mức độ cạnh tranh điểm chuẩn (Thử sức → Vừa sức → An toàn) */
  suggestedOrder: string[] | null;
  /** Mùa tuyển sinh áp dụng kiểm tra quy tắc */
  season: number;
}

type ProfileLike = Pick<ScoreProfile, "method" | "combo" | "priorityRegion" | "priorityGroup" | "budgetMax"> & {
  admission: Pick<AdmissionScore, "rawTotal">;
};

/** Độ "khó" để phân loại: thử sức (2) → vừa sức (1) → an toàn (0). */
const AMBITION: Record<FitLevel, number> = { "thu-suc": 2, "vua-suc": 1, "an-toan": 0 };
const SEVERITY: Record<CheckLevel, number> = { danger: 3, warning: 2, info: 1, ok: 0 };
const nv = (i: number) => `NV${i + 1}`;
const joinNv = (idx: number[]) => (idx.length <= 3 ? idx.map(nv).join(", ") : `${idx.slice(0, 3).map(nv).join(", ")} và ${idx.length - 3} NV khác`);

/** Kiểm tra xem một ngành có phải ngành đào tạo giáo viên / Sư phạm không */
function isTeacherTrainingProgram(program: StrategyItem["program"]): boolean {
  const name = (program.name || "").toLowerCase();
  const majorId = (program.majorId || "").toLowerCase();
  return (
    name.includes("sư phạm") ||
    name.includes("giáo dục") ||
    majorId.includes("su-pham") ||
    majorId.includes("giao-duc") ||
    majorId.startsWith("714") // Mã ngành 714: Khoa học giáo dục và đào tạo giáo viên
  );
}

export function analyzeWishlist(
  items: StrategyItem[],
  profile: ProfileLike | null,
  delta = 0,
  season = 2026
): StrategyReport {
  const policy = admissionPolicyService.getPolicy(season);
  const counts: StrategyReport["counts"] = { "an-toan": 0, "vua-suc": 0, "thu-suc": 0, unknown: 0 };
  const checks: StrategyCheck[] = [];

  if (items.length === 0) {
    return {
      status: "ok",
      checks,
      counts,
      results: [],
      evaluatedItems: [],
      suggestedOrder: null,
      season,
    };
  }

  // 0. Kiểm tra số lượng nguyện vọng theo quy chế 2026 (Tối đa 15 NV)
  const wishlistCountValidation = admissionPolicyService.validateWishlistCount(items.length, season);
  if (!wishlistCountValidation.valid) {
    checks.push({
      id: "max-wishlist",
      level: "danger",
      title: `Vượt quá giới hạn ${wishlistCountValidation.max} nguyện vọng`,
      detail: wishlistCountValidation.warning || `Mùa tuyển sinh ${season} chỉ cho phép tối đa ${wishlistCountValidation.max} nguyện vọng.`,
    });
  }

  // Kiểm tra từng nguyện vọng đào tạo giáo viên (chỉ được đặt NV1 - NV5)
  const invalidTeacherRanks: number[] = [];
  items.forEach((it, idx) => {
    const rank = idx + 1;
    if (isTeacherTrainingProgram(it.program)) {
      const check = admissionPolicyService.isTeacherTrainingRankValid(rank, season);
      if (!check.valid) {
        invalidTeacherRanks.push(idx);
      }
    }
  });

  if (invalidTeacherRanks.length > 0) {
    checks.push({
      id: "teacher-training-rank",
      level: "danger",
      title: `${joinNv(invalidTeacherRanks)} là ngành đào tạo giáo viên nhưng đặt sau NV5`,
      detail: `Theo ${policy.legalDocumentNumber}, các ngành đào tạo giáo viên chỉ được đăng ký từ nguyện vọng 1 đến 5 (NV1–NV5). Hãy chuyển các nguyện vọng này lên top 5 để được xét tuyển hợp lệ.`,
      programIds: invalidTeacherRanks.map((i) => items[i].id),
    });
  }

  if (!profile) {
    counts.unknown = items.length;
    checks.push({
      id: "no-profile",
      level: "info",
      title: "Chưa có điểm để kiểm tra mức an toàn",
      detail: "Nhập điểm (điểm thi THPT, học bạ hoặc ĐGNL) để Trovio đánh giá từng nguyện vọng là An toàn, Vừa sức hay Thử sức và hỗ trợ rà soát chiến lược.",
    });

    const evaluatedItems: EvaluatedWishItem[] = items.map((it, idx) => ({
      id: it.id,
      label: it.label,
      preferenceRank: idx + 1,
      riskBand: "unknown",
      eligibility: { isEligible: true },
      confidence: "low",
      strategyWarnings: [],
    }));

    return {
      status: "incomplete",
      checks,
      counts,
      results: items.map(() => ({ fit: null, reason: "method" as const })),
      evaluatedItems,
      suggestedOrder: null,
      season,
    };
  }

  const method = profileMethod(profile);
  const results = items.map((it) => fitForProfile(profile, it.program, delta));
  results.forEach((r) => (r.fit ? (counts[r.fit.level] += 1) : (counts.unknown += 1)));
  const known = items.length - counts.unknown;

  // 1. Không được xét (sai tổ hợp / không xét phương thức)
  const comboIdx = results.flatMap((r, i) => (r.reason === "combo" ? [i] : []));
  const methodIdx = results.flatMap((r, i) => (r.reason === "method" ? [i] : []));
  if (comboIdx.length) {
    checks.push({
      id: "combo",
      level: "danger",
      title: `${joinNv(comboIdx)} không xét tổ hợp ${profile.combo} của bạn`,
      detail: "Với hồ sơ hiện tại, các nguyện vọng này sẽ không được xét tuyển. Hãy kiểm tra tổ hợp khác của chương trình hoặc thay bằng ngành/trường xét tổ hợp của bạn.",
      programIds: comboIdx.map((i) => items[i].id),
    });
  }
  if (methodIdx.length) {
    checks.push({
      id: "method",
      level: "danger",
      title: `${joinNv(methodIdx)} không xét phương thức ${ADMISSION_METHODS[method].short}`,
      detail: "Chương trình không có điểm chuẩn hoặc không công bố phương thức bạn đang dùng. Hãy kiểm tra phương thức khác tại trang Điểm của tôi hoặc chọn chương trình phù hợp.",
      programIds: methodIdx.map((i) => items[i].id),
    });
  }

  // 2. Không có nguyện vọng an toàn (thiếu phương án dự phòng)
  if (known > 0 && counts["an-toan"] === 0) {
    checks.push({
      id: "no-safe",
      level: "danger",
      title: "Chưa có nguyện vọng An toàn (Thiếu phương án dự phòng)",
      detail: "Nếu không đỗ các nguyện vọng Thử sức và Vừa sức, bạn có thể đối mặt rủi ro không trúng tuyển trường nào. Khuyến nghị nên có ít nhất 1–2 nguyện vọng có biên độ điểm an toàn chắc chắn.",
    });
  }

  // 3. Thứ tự nguyện vọng: Phân tích chiến lược tham khảo (KHÔNG áp đặt sai cơ chế)
  const levels = results.map((r) => r.fit?.level ?? null);
  const blocked: number[] = [];
  let firstPair: [number, number] | null = null;
  for (let j = 0; j < levels.length; j++) {
    const lj = levels[j];
    if (!lj) continue;
    for (let i = 0; i < j; i++) {
      const li = levels[i];
      if (li && AMBITION[li] < AMBITION[lj]) {
        blocked.push(j);
        firstPair ??= [i, j];
        break;
      }
    }
  }

  let suggestedOrder: string[] | null = null;
  if (firstPair) {
    const [i, j] = firstPair;
    // Cảnh báo ở mức warning/info để người dùng hiểu quy chế trúng tuyển cao nhất, nhưng KHÔNG nói "sẽ không bao giờ được xét"
    checks.push({
      id: "order",
      level: "warning",
      title: `Thứ tự tham khảo: ${nv(j)} (${FIT_LABELS[levels[j]!]}) đứng sau ${nv(i)} (${FIT_LABELS[levels[i]!]})`,
      detail: `Lưu ý quy chế xét tuyển: Thí sinh trúng tuyển nguyện vọng ưu tiên cao nhất mà mình đủ điều kiện. Nếu bạn trúng tuyển ${nv(i)}, hệ thống của Bộ sẽ xác nhận vào ${nv(i)} và dừng xét các NV tiếp theo. Nếu ${nv(i)} là trường bạn thực sự yêu thích hơn, thứ tự này hoàn toàn đúng đắn. Nếu bạn muốn ưu tiên cơ hội vào ${nv(j)} trước, hãy cân nhắc đặt ${nv(j)} lên vị trí cao hơn.`,
      programIds: blocked.map((k) => items[k].id),
    });
    // Thứ tự tham khảo theo độ khó cạnh tranh (để học sinh tham khảo nếu muốn)
    suggestedOrder = items
      .map((it, k) => ({ id: it.id, k, rank: levels[k] ? AMBITION[levels[k]!] : -1 }))
      .sort((a, b) => b.rank - a.rank || a.k - b.k)
      .map((x) => x.id);
  }

  // 4. Học phí vượt ngân sách
  if (profile.budgetMax != null && Number.isFinite(profile.budgetMax)) {
    const over = items.flatMap((it, k) => (it.program.tuitionMin > profile.budgetMax! ? [k] : []));
    if (over.length) {
      checks.push({
        id: "budget",
        level: "warning",
        title: `${joinNv(over)} có học phí tối thiểu vượt ngân sách ${profile.budgetMax} triệu/năm`,
        detail: `Học phí thấp nhất: ${over.map((k) => `${nv(k)} từ ${items[k].program.tuitionMin} triệu`).join(", ")}. Cân nhắc tìm hiểu chính sách học bổng, tín dụng sinh viên hoặc thay bằng chương trình phù hợp với ngân sách gia đình.`,
        programIds: over.map((k) => items[k].id),
      });
    }
  }

  // 5. Kiểm tra độ biến động điểm chuẩn lịch sử (Volatility)
  const volatilePrograms = items.filter((it) => {
    const cutoffs = it.program.cutoffs;
    if (cutoffs.length < 3) return false;
    const scores = cutoffs.map((c) => c.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    return Math.sqrt(variance) >= 1.2;
  });

  if (volatilePrograms.length) {
    checks.push({
      id: "volatile-cutoffs",
      level: "info",
      title: `${volatilePrograms.length} chương trình có điểm chuẩn biến động mạnh qua các năm`,
      detail: `Các chương trình (${volatilePrograms.map((p) => p.label).slice(0, 2).join(", ")}) có độ lệch chuẩn điểm 3 năm lớn (σ ≥ 1.2). Khuyến nghị dự phòng khoảng cách điểm an toàn từ +1.5 điểm trở lên thay vì +1.0 điểm.`,
      programIds: volatilePrograms.map((p) => p.id),
    });
  }

  // 6. Cân bằng danh sách & Tỉ lệ phân bổ nguyện vọng tham khảo (30–40–30)
  if (known >= 4) {
    const rReach = counts["thu-suc"] / known;
    const rTarget = counts["vua-suc"] / known;
    const rSafe = counts["an-toan"] / known;
    if (rReach >= 0.2 && rReach <= 0.4 && rTarget >= 0.3 && rTarget <= 0.6 && rSafe >= 0.2 && rSafe <= 0.4) {
      checks.push({
        id: "golden-ratio",
        level: "ok",
        title: "Đạt cơ cấu phân bổ nguyện vọng cân bằng tham khảo",
        detail: `Danh mục phân bổ cân đối: ${Math.round(rReach * 100)}% Thử sức, ${Math.round(rTarget * 100)}% Vừa sức, ${Math.round(rSafe * 100)}% An toàn, giúp phân bổ cơ hội hợp lý giữa nguyện vọng mong ước và phương án dự phòng.`,
      });
    }
  }

  if (known >= 2 && counts["thu-suc"] / known > 0.6) {
    checks.push({
      id: "too-risky",
      level: "warning",
      title: "Phần lớn nguyện vọng thuộc nhóm Thử sức",
      detail: "Danh sách có độ rủi ro cao. Khuyến nghị bổ sung thêm các nguyện vọng Vừa sức và An toàn để đảm bảo cơ hội trúng tuyển.",
    });
  }

  if (known >= 2 && counts["an-toan"] === known) {
    checks.push({
      id: "too-safe",
      level: "info",
      title: "Toàn bộ nguyện vọng đều thuộc nhóm An toàn",
      detail: "Bạn có thể tự tin thêm 1–2 nguyện vọng thuộc ngành/trường yêu thích hơn ở nhóm Vừa sức hoặc Thử sức ở vị trí ưu tiên cao.",
    });
  }

  if (items.length < 3) {
    checks.push({
      id: "few",
      level: "info",
      title: "Danh sách còn ít nguyện vọng",
      detail: "Khuyến nghị nên xây dựng từ 3 đến 5 nguyện vọng, trải đều các nhóm để vừa phấn đấu vừa có phương án an toàn.",
    });
  }

  // Tạo danh sách evaluatedItems chi tiết
  const evaluatedItems: EvaluatedWishItem[] = items.map((it, idx) => {
    const fitRes = results[idx];
    const riskBand: FitLevel | "unknown" = fitRes.fit?.level ?? "unknown";
    const warnings: string[] = [];
    let isEligible = true;
    let failReason: EvaluatedWishItem["eligibility"]["reason"];
    let failMsg: string | undefined;

    if (fitRes.reason === "combo") {
      isEligible = false;
      failReason = "combo";
      failMsg = `Không xét tổ hợp ${profile.combo}`;
      warnings.push(failMsg);
    } else if (fitRes.reason === "method") {
      isEligible = false;
      failReason = "method";
      failMsg = `Không xét phương thức ${ADMISSION_METHODS[method].short}`;
      warnings.push(failMsg);
    }

    if (isTeacherTrainingProgram(it.program) && idx + 1 > 5) {
      isEligible = false;
      failReason = "teacher-training-rank";
      failMsg = "Ngành đào tạo giáo viên phải đặt từ NV1–NV5 theo Thông tư 06/2026/TT-BGDĐT";
      warnings.push(failMsg);
    }

    if (profile.budgetMax && it.program.tuitionMin > profile.budgetMax) {
      warnings.push(`Học phí (${it.program.tuitionMin} tr) vượt ngân sách (${profile.budgetMax} tr)`);
    }

    // Xác định confidence dựa trên số năm dữ liệu điểm chuẩn
    const cutoffsCount = it.program.cutoffs?.length || 0;
    const confidence: "high" | "medium" | "low" =
      cutoffsCount >= 3 ? "high" : cutoffsCount === 2 ? "medium" : "low";

    return {
      id: it.id,
      label: it.label,
      preferenceRank: idx + 1,
      riskBand,
      eligibility: {
        isEligible,
        reason: failReason,
        message: failMsg,
      },
      confidence,
      strategyWarnings: warnings,
    };
  });

  const worst = checks.reduce<CheckLevel>((w, c) => (SEVERITY[c.level] > SEVERITY[w] ? c.level : w), "ok");
  if (SEVERITY[worst] < SEVERITY.warning && !checks.some((c) => c.id === "golden-ratio")) {
    checks.unshift({
      id: "ok",
      level: "ok",
      title: "Danh sách hợp lý theo mong muốn",
      detail: `Danh sách có ${counts["an-toan"]} nguyện vọng An toàn dự phòng. Thứ tự đăng ký thể hiện đúng sở thích và mong muốn của bạn.`,
    });
  }

  checks.sort((a, b) => SEVERITY[b.level] - SEVERITY[a.level]);

  return {
    status: worst,
    checks,
    counts,
    results,
    evaluatedItems,
    suggestedOrder,
    season,
  };
}

/** So sánh mức phù hợp trước/sau khi điểm thay đổi `delta` (mô phỏng "Nếu điểm của mình thay đổi…"). */
export function simulateDelta(items: StrategyItem[], profile: ProfileLike, delta: number) {
  return items.map((it) => {
    const before = fitForProfile(profile, it.program, 0).fit?.level ?? null;
    const after = fitForProfile(profile, it.program, delta).fit?.level ?? null;
    return { id: it.id, before, after, changed: before !== after };
  });
}

/** Wrapper phân tích chiến lược nguyện vọng theo chuẩn GIAI ĐOẠN 2 */
export function analyzeWishlistStrategy(
  items: StrategyItem[],
  profile: any,
  season: number = 2026
) {
  let p = profile;
  if (profile && !profile.admission && profile.scores) {
    const rawTotal = Object.values(profile.scores as Record<string, number>).reduce((a, b) => a + b, 0);
    p = {
      ...profile,
      admission: { rawTotal },
    };
  }
  const report = analyzeWishlist(items, p, 0, season);
  const riskBandLabels: Record<string, string> = {
    "an-toan": "An toàn",
    "vua-suc": "Vừa sức",
    "thu-suc": "Thử sức",
    unknown: "Chưa xác định",
  };
  return {
    ...report,
    items: report.evaluatedItems.map((it) => {
      const riskBand = riskBandLabels[it.riskBand] || it.riskBand;
      const strategyNote =
        it.strategyWarnings.join("; ") ||
        "Thứ tự nguyện vọng thể hiện mức độ ưu tiên theo mong muốn thực tế của thí sinh. Khi xét tuyển, hệ thống xét tuyển sẽ xét lần lượt từ trên xuống dưới theo thứ tự này và dừng lại ở nguyện vọng trúng tuyển đầu tiên.";
      return {
        ...it,
        riskBand,
        strategyNote,
      };
    }),
    warnings: report.checks.map((c) => ({
      id: c.id,
      level: c.level,
      title: c.title,
      message: `${c.title}: ${c.detail}`,
    })),
  };
}

