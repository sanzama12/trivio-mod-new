/**
 * DOMAIN MODEL — Chính sách quy đổi chứng chỉ quốc tế (IELTS, TOEFL, SAT...) theo từng trường / ngành / mùa tuyển sinh.
 */

export type CertificateType = "IELTS" | "TOEFL_IBT" | "SAT" | "ACT";

export interface CertificateConversionPolicy {
  id: string;
  season: number; // 2026
  institutionId: string; // schoolId: "dai-hoc-bach-khoa-ha-noi", "dai-hoc-kinh-te-quoc-dan", v.v.
  programId?: string; // Nếu áp dụng riêng cho chương trình cụ thể, undefined = toàn trường
  certificateType: CertificateType;
  admissionMethod: string; // "xet-tuyen-ket-hop", "thpt", v.v.
  minimumCertificateScore: number; // Ví dụ 5.0 hoặc 5.5
  conversionTable: Record<string, number>; // Ví dụ: { "5.5": 8.5, "6.0": 9.0, ... }
  subjectReplacement: string; // "tieng-anh"
  formulaDescription: string;
  maximumConvertedScore: number; // 10.0
  eligibilityConditions: string[];
  officialSourceUrl: string;
  documentTitle: string;
  publishedAt: string;
  verifiedAt: string;
  status: "verified" | "unverified";
  notes?: string;
}

export type CertificateConversionResult =
  | {
      ok: true;
      convertedScore: number;
      policy: CertificateConversionPolicy;
      explanation: string;
    }
  | {
      ok: false;
      reason: string;
      convertedScore: null;
      policy?: CertificateConversionPolicy;
    };
