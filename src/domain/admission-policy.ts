/**
/**
 * DOMAIN MODEL — Quy chế & Chính sách Tuyển sinh theo Mùa Tuyển Sinh.
 * Hỗ trợ đa phiên bản, có nguồn gốc pháp lý, ngày ban hành và thời hạn hiệu lực.
 */

export type PolicyStatus = "draft" | "official" | "expired";

export interface PriorityRegionRule {
  points: number;
  label: string;
}

export interface PriorityGroupRule {
  points: number;
  label: string;
  targetObjects: string; // "Đối tượng 01–03"
}

export interface AdmissionPriorityRules {
  reductionThreshold: number; // 22.5 (thang 30)
  reductionFormula: string; // "((30 - Tổng điểm) / 7.5) * Điểm ưu tiên"
  regions: {
    KV1: PriorityRegionRule;
    "KV2-NT": PriorityRegionRule;
    KV2: PriorityRegionRule;
    KV3: PriorityRegionRule;
  };
  groups: {
    none: PriorityGroupRule;
    UT1: PriorityGroupRule;
    UT2: PriorityGroupRule;
  };
}

export interface AdmissionPolicy {
  season: number; // Ví dụ 2026
  effectiveFrom: string; // "2026-02-15"
  effectiveTo: string; // "2026-12-31"
  status: PolicyStatus;
  issuer: string; // "Bộ Giáo dục và Đào tạo"
  legalDocumentNumber: string; // "Thông tư 06/2026/TT-BGDĐT"
  officialSourceUrl: string;
  publishedAt: string;
  accessedAt: string;

  // Giới hạn nguyện vọng
  maxWishlistItems: number; // 15
  teacherTrainingAllowedRanks: [number, number]; // [1, 5] - Ngành đào tạo giáo viên chỉ xét NV 1-5

  // Phương thức học bạ
  transcriptSemesterCount: number; // 6 học kỳ (lớp 10, 11, 12)
  transcriptMinimumSubjectCount: number; // 3 môn
  mandatorySubjectsForTranscript: string[]; // ["Toán", "Ngữ văn"] - Phải có ít nhất 1 trong các môn này
  mandatorySubjectMinWeightRatio: number; // 1/3 tổng trọng số thang 30
  transcriptMinimumThptScore?: number; // Ngưỡng điểm thi THPT 16 điểm nếu có

  // Ngưỡng đảm bảo chất lượng
  minimumThptScoreThreshold: number; // 15.0 / 30

  // Quy tắc điểm ưu tiên
  priorityRules: AdmissionPriorityRules;

  // Quy tắc điểm thưởng & cộng
  bonusRules: {
    maxBonusPoints: number; // Trần điểm thưởng tối đa
    maxTotalAfterBonus: number; // 30.0
  };

  // Chính sách chứng chỉ (IELTS/TOEFL)
  certificatePolicyMode: "institution_specific" | "centralized"; // "institution_specific": Từng trường tự quy định

  notes: string;
}
