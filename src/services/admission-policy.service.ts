/**
 * SERVICE LAYER — Quản lý và thực thi Quy chế & Chính sách tuyển sinh theo mùa.
 * Mọi quy tắc tuyển sinh được liên kết với văn bản quy phạm pháp luật, ngày ban hành và ngày truy cập.
 */
import type { AdmissionPolicy } from "../domain/admission-policy";

const normalizeSubject = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_-]+/g, "").trim();
export const isMathOrLiterature = (value: string) => ["toan", "van", "nguvan"].includes(normalizeSubject(value));

export const OFFICIAL_POLICY_2026: AdmissionPolicy = {
  season: 2026,
  effectiveFrom: "2026-02-15",
  status: "official",
  issuer: "Bộ Giáo dục và Đào tạo",
  legalDocumentNumber: "Thông tư số 06/2026/TT-BGDĐT",
  officialSourceUrl: "https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/3/06-bgddt.pdf",
  publishedAt: "2026-02-15",
  accessedAt: "2026-11-18",
  maxWishlistItems: 15,
  teacherTrainingAllowedRanks: [1, 5],
  transcriptSemesterCount: 6,
  transcriptMinimumSubjectCount: 3,
  mandatorySubjectsForTranscript: ["Toán", "Ngữ văn", "Toan", "Ngu van", "Văn"],
  mandatorySubjectMinWeightRatio: 1 / 3,
  minimumThptScoreThreshold: 15.0,
  priorityRules: {
    reductionThreshold: 22.5,
    reductionFormula: "((30 - Tổng điểm) / 7.5) * Điểm ưu tiên quy định",
    regions: {
      KV1: { points: 0.75, label: "Khu vực 1 (+0.75)" },
      "KV2-NT": { points: 0.5, label: "Khu vực 2 - Nông thôn (+0.50)" },
      KV2: { points: 0.25, label: "Khu vực 2 (+0.25)" },
      KV3: { points: 0.0, label: "Khu vực 3 (0.00)" },
    },
    groups: {
      none: { points: 0.0, label: "Không thuộc diện đối tượng ưu tiên", targetObjects: "Không có" },
      UT1: { points: 2.0, label: "Nhóm ưu tiên 1 (+2.00)", targetObjects: "Đối tượng 01 đến 03 theo Phụ lục II" },
      UT2: { points: 1.0, label: "Nhóm ưu tiên 2 (+1.00)", targetObjects: "Đối tượng 04 đến 06 theo Phụ lục II" },
    },
  },
  bonusRules: {
    maxBonusPoints: 3.0,
    maxTotalAfterBonus: 30.0,
    categories: { directAdmissionUnused: 3.0, achievementOrTalent: 1.5, internationalCertificate: 1.5 },
    institutionSpecific: true,
  },
  certificatePolicyMode: "institution_specific",
  notes: "Quy chế tuyển sinh chính thức áp dụng cho mùa tuyển sinh năm 2026 theo Thông tư số 06/2026/TT-BGDĐT. Giới hạn tối đa 15 nguyện vọng; đào tạo giáo viên chỉ xét NV 1-5; học bạ dùng 6 học kỳ có Toán hoặc Văn tối thiểu 1/3 trọng số.",
};

export const ADMISSION_POLICY_2026 = OFFICIAL_POLICY_2026;

export const EXPIRED_POLICY_2025: AdmissionPolicy = {
  season: 2025,
  effectiveFrom: "2022-07-22",
  effectiveTo: "2026-02-14",
  status: "expired",
  issuer: "Bộ Giáo dục và Đào tạo",
  legalDocumentNumber: "Thông tư 08/2022/TT-BGDĐT",
  officialSourceUrl: "https://vanban.chinhphu.vn/?classid=1&docid=205697&orggroupid=4&pageid=27160",
  publishedAt: "2022-06-06",
  accessedAt: "2026-10-11",
  maxWishlistItems: 50, // Trước 2026 không giới hạn chặt 15 NV
  teacherTrainingAllowedRanks: [1, 50],
  transcriptSemesterCount: 5, // Nhiều trường trước 2026 chỉ xét 3-5 học kỳ
  transcriptMinimumSubjectCount: 3,
  mandatorySubjectsForTranscript: ["Toán", "Ngữ văn", "Toan", "Ngu van", "Văn"],
  mandatorySubjectMinWeightRatio: 0.0,
  minimumThptScoreThreshold: 0.0,
  priorityRules: {
    reductionThreshold: 22.5,
    reductionFormula: "((30 - Tổng điểm) / 7.5) * Điểm ưu tiên quy định",
    regions: {
      KV1: { points: 0.75, label: "Khu vực 1 (+0.75)" },
      "KV2-NT": { points: 0.5, label: "Khu vực 2 - Nông thôn (+0.50)" },
      KV2: { points: 0.25, label: "Khu vực 2 (+0.25)" },
      KV3: { points: 0.0, label: "Khu vực 3 (0.00)" },
    },
    groups: {
      none: { points: 0.0, label: "Không thuộc diện đối tượng ưu tiên", targetObjects: "Không có" },
      UT1: { points: 2.0, label: "Nhóm ưu tiên 1 (+2.00)", targetObjects: "Đối tượng 01 đến 04" },
      UT2: { points: 1.0, label: "Nhóm ưu tiên 2 (+1.00)", targetObjects: "Đối tượng 05 đến 07" },
    },
  },
  bonusRules: {
    maxBonusPoints: 3.0,
    maxTotalAfterBonus: 30.0,
  },
  certificatePolicyMode: "institution_specific",
  notes: "Quy chế tuyển sinh áp dụng cho các mùa tuyển sinh trước năm 2026 (đã hết hiệu lực từ ngày 15/02/2026).",
};

const POLICIES_REGISTRY: Record<number, AdmissionPolicy> = {
  2025: EXPIRED_POLICY_2025,
  2026: OFFICIAL_POLICY_2026,
};

export const admissionPolicyService = {
  /**
   * Lấy policy của mùa tuyển sinh. Mặc định là 2026.
   * Nếu yêu cầu policy không tồn tại hoặc draft, có thông báo trạng thái rõ ràng.
   */
  getPolicy(season: number = 2026): AdmissionPolicy {
    const policy = POLICIES_REGISTRY[season];
    if (!policy) {
      throw new RangeError(`Chưa có quy chế được xác minh cho mùa ${season}.`);
    }
    return policy;
  },

  listPolicies(): AdmissionPolicy[] {
    return Object.values(POLICIES_REGISTRY);
  },

  /**
   * Kiểm tra xem policy có đang là chính thức và còn hiệu lực tại ngày khảo sát không.
   */
  isPolicyEffective(policy: AdmissionPolicy, dateStr: string = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })): boolean {
    if (policy.status !== "official") return false;
    return dateStr >= policy.effectiveFrom && (!policy.effectiveTo || dateStr <= policy.effectiveTo);
  },

  /**
   * Kiểm tra giới hạn số lượng nguyện vọng theo mùa tuyển sinh.
   */
  validateWishlistCount(count: number, season: number = 2026): { valid: boolean; max: number; warning?: string } {
    const policy = this.getPolicy(season);
    if (count > policy.maxWishlistItems) {
      return {
        valid: false,
        max: policy.maxWishlistItems,
        warning: `Theo ${policy.legalDocumentNumber} (${policy.issuer}), mùa tuyển sinh ${policy.season} chỉ cho phép đăng ký tối đa ${policy.maxWishlistItems} nguyện vọng. Hiện tại bạn đang có ${count} nguyện vọng.`,
      };
    }
    return { valid: true, max: policy.maxWishlistItems };
  },

  /**
   * Kiểm tra xem một nguyện vọng thuộc ngành sư phạm / đào tạo giáo viên có được đặt ở thứ tự `rank` (1-based) không.
   */
  isTeacherTrainingRankValid(rank: number, season: number = 2026): { valid: boolean; allowedRange: [number, number]; warning?: string } {
    const policy = this.getPolicy(season);
    const [minRank, maxRank] = policy.teacherTrainingAllowedRanks;
    if (rank < minRank || rank > maxRank) {
      return {
        valid: false,
        allowedRange: policy.teacherTrainingAllowedRanks,
        warning: `Theo ${policy.legalDocumentNumber}, các ngành đào tạo giáo viên chỉ được đăng ký từ nguyện vọng 1 đến 5 (nguyện vọng ${minRank} đến nguyện vọng ${maxRank}). Nguyện vọng hiện tại đang ở vị trí NV${rank}.`,
      };
    }
    return { valid: true, allowedRange: policy.teacherTrainingAllowedRanks };
  },

  /**
   * Kiểm tra hợp lệ cho phương thức học bạ theo quy chế mùa tuyển sinh.
   */
  validateTranscriptMethod(
    input: {
      subjects: string[];
      semesterCount: number;
      mathOrLiteratureWeight: number; // Ví dụ 1/3
      thptScore?: number;
      convertedCertificateScore?: number;
    },
    season: number = 2026
  ): { valid: boolean; reasons: string[] } {
    const policy = this.getPolicy(season);
    const reasons: string[] = [];

    if (!Number.isInteger(input.semesterCount) || input.semesterCount !== policy.transcriptSemesterCount) {
      reasons.push(
        `Phương thức xét học bạ năm ${policy.season} yêu cầu kết quả học tập đủ ${policy.transcriptSemesterCount} học kỳ (lớp 10, 11, 12). Hồ sơ hiện có ${input.semesterCount} học kỳ.`
      );
    }

    const certificateScore = input.convertedCertificateScore;
    const hasCertificate = certificateScore !== undefined;
    const validCertificate = hasCertificate && Number.isFinite(certificateScore) && certificateScore >= 0 && certificateScore <= 10;
    if (hasCertificate && !validCertificate) {
      reasons.push("Điểm chứng chỉ ngoại ngữ quy đổi phải nằm trong thang 0–10.");
    }
    const minimumSubjects = validCertificate ? 2 : policy.transcriptMinimumSubjectCount;
    if (new Set(input.subjects.map(normalizeSubject)).size < minimumSubjects) {
      reasons.push(
        `Tổ hợp xét học bạ phải có ít nhất ${minimumSubjects} môn học${validCertificate ? " kèm điểm chứng chỉ ngoại ngữ quy đổi" : ""}.`
      );
    }

    const hasMandatorySubject = input.subjects.some(isMathOrLiterature);

    if (!hasMandatorySubject) {
      reasons.push(
        `Tổ hợp xét học bạ theo quy chế ${policy.season} bắt buộc phải có môn Toán hoặc Ngữ văn.`
      );
    } else if (!Number.isFinite(input.mathOrLiteratureWeight) || input.mathOrLiteratureWeight < policy.mandatorySubjectMinWeightRatio) {
      reasons.push(
        `Môn Toán hoặc Ngữ văn phải chiếm tối thiểu 1/3 tổng trọng số (xấp xỉ 33.3%) tính điểm xét tuyển theo thang điểm 30.`
      );
    }

    if (
      input.thptScore != null &&
      (!Number.isFinite(input.thptScore) || input.thptScore < 0 || input.thptScore > 30)
    ) {
      reasons.push(
        "Tổng điểm thi THPT phải là số từ 0 đến 30. Ngưỡng nguồn tuyển được kiểm tra riêng theo năm tốt nghiệp và diện ngoại lệ."
      );
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  },

  /**
   * Tính toán điểm ưu tiên phi tuyến (giảm dần từ 22.5) theo quy chuẩn.
   */
  computePriorityPoints(
    region: "KV1" | "KV2-NT" | "KV2" | "KV3",
    group: "none" | "UT1" | "UT2",
    rawTotal: number,
    scale: number = 30,
    season: number = 2026,
    graduationYear?: number,
  ): {
    rawPriority: number;
    appliedPriority: number;
    isReduced: boolean;
    reductionThreshold: number;
  } {
    const policy = this.getOfficialPolicy(season);
    if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(rawTotal) || rawTotal < 0 || rawTotal > scale) {
      throw new RangeError("Điểm phải nằm trong thang điểm xét tuyển hợp lệ.");
    }
    if (!Object.hasOwn(policy.priorityRules.regions, region) || !Object.hasOwn(policy.priorityRules.groups, group)) {
      throw new RangeError("Khu vực hoặc đối tượng ưu tiên không hợp lệ.");
    }
    if (graduationYear !== undefined && (!Number.isInteger(graduationYear) || graduationYear < 1900 || graduationYear > season)) {
      throw new RangeError("Năm tốt nghiệp không hợp lệ với mùa tuyển sinh.");
    }
    // Chưa biết năm tốt nghiệp thì không tự cấp ưu tiên khu vực.
    const regionEligible = graduationYear !== undefined && season - graduationYear <= 1;
    const regPoints = regionEligible ? policy.priorityRules.regions[region].points : 0;
    const grpPoints = policy.priorityRules.groups[group].points;

    const factor = scale / 30;
    const rawPriority = Math.round((regPoints + grpPoints) * factor * 100) / 100;
    const threshold = policy.priorityRules.reductionThreshold * factor;

    if (rawTotal < threshold) {
      return {
        rawPriority,
        appliedPriority: rawPriority,
        isReduced: false,
        reductionThreshold: threshold,
      };
    }

    // Công thức giảm điểm ưu tiên phi tuyến:
    // Điểm ưu tiên = [(Thang điểm tối đa - Tổng điểm đạt được) / (Thang điểm tối đa - Ngưỡng)] * Mức điểm ưu tiên quy định
    const maxScale = scale;
    const diff = Math.max(0, maxScale - rawTotal);
    const denominator = maxScale - threshold; // ví dụ 30 - 22.5 = 7.5
    const ratio = denominator > 0 ? diff / denominator : 0;
    const appliedPriority = Math.round(ratio * rawPriority * 100) / 100;

    return {
      rawPriority,
      appliedPriority,
      isReduced: true,
      reductionThreshold: threshold,
    };
  },

  getOfficialPolicy(season: number = 2026): AdmissionPolicy {
    const policy = this.getPolicy(season);
    if (policy.status !== "official") {
      throw new Error(`Policy mùa tuyển sinh ${season} không phải là quy chế chính thức (trạng thái: ${policy.status}).`);
    }
    return policy;
  },
};

/** Tính điểm ưu tiên phi tuyến theo quy chế tuyển sinh */
export function calculatePriorityPoints(
  rawTotal: number,
  region: "KV1" | "KV2-NT" | "KV2" | "KV3",
  group: "none" | "UT1" | "UT2",
  season: number = 2026
): {
  basePriority: number;
  appliedPriority: number;
  isReduced: boolean;
  reductionThreshold: number;
} {
  const res = admissionPolicyService.computePriorityPoints(region, group, rawTotal, 30, season);
  return {
    basePriority: res.rawPriority,
    appliedPriority: res.appliedPriority,
    isReduced: res.isReduced,
    reductionThreshold: res.reductionThreshold,
  };
}

/** Kiểm tra tính hợp lệ của phương thức học bạ theo quy chế 2026 */
export function validateTranscriptRule(
  input: {
    semesterCount: number;
    subjects: string[];
    subjectWeights?: Record<string, number>;
    thptScore?: number;
    convertedCertificateScore?: number;
    certificateWeight?: number;
  },
  season: number = 2026
): { valid: boolean; message?: string } {
  const subjects = input.subjects || [];
  const hasCertificate = input.convertedCertificateScore !== undefined;
  if (hasCertificate && input.certificateWeight !== undefined && (!Number.isFinite(input.certificateWeight) || input.certificateWeight <= 0)) {
    return { valid: false, message: "Trọng số chứng chỉ ngoại ngữ phải là số dương hợp lệ." };
  }
  let mathOrLitWeight = 0;
  if (input.subjectWeights) {
    const weights = subjects.map(subject => input.subjectWeights![subject]);
    if (weights.some(weight => !Number.isFinite(weight) || weight <= 0)) {
      return { valid: false, message: "Trọng số từng môn phải là số dương hợp lệ." };
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0) + (hasCertificate ? input.certificateWeight ?? 1 : 0);
    // Một môn Toán HOẶC Văn phải đạt 1/3, không cộng trọng số hai môn để lách ngưỡng.
    mathOrLitWeight = Math.max(0, ...subjects.filter(isMathOrLiterature).map(subject => input.subjectWeights![subject] / totalWeight));
  } else {
    mathOrLitWeight = subjects.some(isMathOrLiterature) ? 1 / (new Set(subjects).size + (hasCertificate ? 1 : 0)) : 0;
  }

  const res = admissionPolicyService.validateTranscriptMethod(
    {
      subjects,
      semesterCount: input.semesterCount,
      mathOrLiteratureWeight: mathOrLitWeight,
      thptScore: input.thptScore,
      convertedCertificateScore: input.convertedCertificateScore,
    },
    season
  );

  return {
    valid: res.valid,
    message: res.reasons.join("; "),
  };
}

/** Kiểm tra thứ tự nguyện vọng cho ngành đào tạo giáo viên */
export function validateTeacherTrainingRank(
  rank: number,
  season: number = 2026
): { valid: boolean; message?: string } {
  const res = admissionPolicyService.isTeacherTrainingRankValid(rank, season);
  return {
    valid: res.valid,
    message: res.warning || "Nguyện vọng ngành đào tạo giáo viên hợp lệ (từ nguyện vọng 1 đến 5)",
  };
}

/** Kiểm tra ngưỡng điểm đầu vào từ điểm thi tốt nghiệp THPT */
export function validateAdmissionScoreThreshold(
  score: number,
  season: number = 2026
): { valid: boolean; message?: string } {
  const policy = admissionPolicyService.getPolicy(season);
  if (!Number.isFinite(score) || score < policy.minimumThptScoreThreshold || score > 30) {
    return {
      valid: false,
      message: `Ngưỡng điểm đầu vào từ điểm thi tốt nghiệp THPT phải đạt tối thiểu ${policy.minimumThptScoreThreshold}/30 điểm theo quy chế mùa ${policy.season}.`,
    };
  }
  return { valid: true };
}

