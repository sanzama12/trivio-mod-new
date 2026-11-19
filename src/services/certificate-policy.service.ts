/**
 * SERVICE LAYER — Quản lý và tính toán quy đổi chứng chỉ theo chính sách từng trường/ngành/mùa tuyển sinh.
 * NGUYÊN TẮC: Fail-closed — Không sử dụng bảng quy đổi chung khi trường/ngành chưa có đề án được kiểm chứng chính thức.
 */
import type {
  CertificateConversionPolicy,
  CertificateConversionResult,
  CertificateType,
} from "../domain/certificate-policy";

// Dữ liệu chính sách quy đổi đã được kiểm chứng từ đề án tuyển sinh chính thức của các trường
// Previous tables linked only to homepages, not a document supporting each conversion.
// Keep conversions unavailable until a specific institution/season publication is verified.
export const VERIFIED_CERTIFICATE_POLICIES: CertificateConversionPolicy[] = [];

export const certificatePolicyService = {
  /**
   * Tìm chính sách quy đổi chứng chỉ theo trường, ngành, loại chứng chỉ và mùa tuyển sinh.
   */
  findPolicy(params: {
    institutionId: string;
    programId?: string;
    certificateType: CertificateType;
    season?: number;
  }): CertificateConversionPolicy | null {
    const season = params.season ?? 2026;
    // Chuẩn hóa mã trường (slug hoặc ID ngắn)
    const instId = params.institutionId.toLowerCase().trim();

    return (
      VERIFIED_CERTIFICATE_POLICIES.find((p) => {
        if (p.season !== season) return false;
        if (p.certificateType !== params.certificateType) return false;
        if (p.status !== "verified") return false;

        if (p.institutionId !== instId) return false;
        if (p.programId && p.programId !== params.programId) return false;
        return true;
      }) ?? null
    );
  },

  /**
   * Quy đổi điểm chứng chỉ sang điểm môn học theo chính sách trường cụ thể.
   * Nếu không có chính sách chính thức được xác minh, từ chối quy đổi (fail-closed).
   */
  convertScore(params: {
    institutionId?: string;
    programId?: string;
    certificateType: CertificateType;
    score: number | string;
    season?: number;
  }): CertificateConversionResult {
    if (!params.institutionId) {
      return {
        ok: false,
        reason: "Chưa chọn trường để tra cứu chính sách quy đổi chứng chỉ",
        convertedScore: null,
      };
    }

    const policy = this.findPolicy({
      institutionId: params.institutionId,
      programId: params.programId,
      certificateType: params.certificateType,
      season: params.season,
    });

    if (!policy) {
      return {
        ok: false,
        reason: "Không có chính sách quy đổi được xác minh cho trường/ngành này",
        convertedScore: null,
      };
    }

    const rawKey = typeof params.score === "number" ? params.score.toFixed(1) : String(params.score).trim();
    const numScore = parseFloat(rawKey);

    if (numScore < policy.minimumCertificateScore) {
      return {
        ok: false,
        reason: `Điểm chứng chỉ ${params.certificateType} (${rawKey}) chưa đạt ngưỡng tối thiểu ${policy.minimumCertificateScore} theo quy định của trường.`,
        convertedScore: null,
        policy,
      };
    }

    const converted = policy.conversionTable[rawKey];
    if (converted == null) {
      // Nếu điểm lớn hơn mốc cao nhất trong bảng, lấy điểm tối đa
      const maxKey = Math.max(...Object.keys(policy.conversionTable).map(Number));
      if (numScore >= maxKey) {
        return {
          ok: true,
          convertedScore: policy.maximumConvertedScore,
          policy,
          explanation: `${policy.formulaDescription}: ${params.certificateType} ${rawKey} quy đổi thành ${policy.maximumConvertedScore} điểm môn ${policy.subjectReplacement}. (Nguồn: ${policy.documentTitle})`,
        };
      }
      return {
        ok: false,
        reason: `Mức điểm ${rawKey} không nằm trong bảng quy đổi chính thức của trường.`,
        convertedScore: null,
        policy,
      };
    }

    return {
      ok: true,
      convertedScore: converted,
      policy,
      explanation: `${policy.formulaDescription}: ${params.certificateType} ${rawKey} quy đổi thành ${converted} điểm môn ${policy.subjectReplacement}. (Nguồn: ${policy.documentTitle})`,
    };
  },

  /**
   * Phương thức wrapper chuẩn cho unit test và controller
   */
  convertCertificate(params: {
    institutionId: string;
    certificateType: string;
    score: number;
    season?: number;
    programId?: string;
  }):
    | { ok: true; result: { convertedScore: number; policy: CertificateConversionPolicy; explanation: string } }
    | { ok: false; code: "NO_POLICY_FOUND" | "SCORE_BELOW_MINIMUM" | "INVALID_SCORE"; message: string } {
    const certType = params.certificateType.toUpperCase() as CertificateType;
    const policy = this.findPolicy({
      institutionId: params.institutionId,
      programId: params.programId,
      certificateType: certType,
      season: params.season,
    });

    if (!policy) {
      return {
        ok: false,
        code: "NO_POLICY_FOUND",
        message: `Trường ${params.institutionId} chưa có chính sách quy đổi chứng chỉ ${params.certificateType} được xác minh cho mùa tuyển sinh ${params.season ?? 2026}.`,
      };
    }

    if (params.score < policy.minimumCertificateScore) {
      return {
        ok: false,
        code: "SCORE_BELOW_MINIMUM",
        message: `Điểm chứng chỉ ${params.score} chưa đạt ngưỡng tối thiểu (${policy.minimumCertificateScore}) theo quy định của trường.`,
      };
    }

    const key = params.score.toFixed(1);
    const converted = policy.conversionTable[key];
    if (converted == null) {
      const maxKey = Math.max(...Object.keys(policy.conversionTable).map(Number));
      if (params.score >= maxKey) {
        return {
          ok: true,
          result: {
            convertedScore: policy.maximumConvertedScore,
            policy,
            explanation: `${policy.formulaDescription}: ${params.score} -> ${policy.maximumConvertedScore}`,
          },
        };
      }
      return {
        ok: false,
        code: "INVALID_SCORE",
        message: `Mức điểm ${params.score} không nằm trong bảng quy đổi chính thức của trường.`,
      };
    }

    return {
      ok: true,
      result: {
        convertedScore: converted,
        policy,
        explanation: `${policy.formulaDescription}: ${params.score} -> ${converted}`,
      },
    };
  },
};
