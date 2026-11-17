/**
 * CONTROLLER LAYER (MVC Architecture) — ScoringController
 * Tiếp nhận và xử lý các yêu cầu liên quan đến tính điểm xét tuyển,
 * quy đổi điểm ưu tiên, quy đổi chứng chỉ Ngoại ngữ và đánh giá mức độ phù hợp.
 */
import { NextResponse } from "next/server";
import {
  computeAdmissionScore,
  computeWeightedComboTotal,
  evaluateTieBreaker,
  isMethodKey,
} from "../services/scoring.service";
import { certificatePolicyService } from "../services/certificate-policy.service";
import type { PriorityGroup, PriorityRegion, Combo } from "../models";
import { jsonBody } from "../lib/http";
import type { CertificateType } from "../domain/certificate-policy";

export class ScoringController {
  /**
   * Tính toán điểm xét tuyển theo các tham số gửi lên
   */
  static async calculateScore(req: Request): Promise<Response> {
    const { body, error } = await jsonBody(req, 8 * 1024);
    if (error) return error;
    const b = body ?? {};

    if (typeof b.rawTotal !== "number" || !Number.isFinite(b.rawTotal) || b.rawTotal < 0 || b.rawTotal > 30 ||
        (b.method !== undefined && !isMethodKey(b.method)) ||
        (b.region !== undefined && (typeof b.region !== "string" || !["KV1", "KV2-NT", "KV2", "KV3"].includes(b.region))) ||
        (b.group !== undefined && (typeof b.group !== "string" || !["none", "UT1", "UT2"].includes(b.group))) ||
        (b.season !== undefined && b.season !== 2026) ||
        (b.graduationYear !== undefined && (typeof b.graduationYear !== "number" || !Number.isInteger(b.graduationYear) || b.graduationYear < 1900 || b.graduationYear > 2026))) {
      return NextResponse.json({ ok: false, error: "Điểm phải từ 0 đến 30; phương thức, khu vực, đối tượng và năm tốt nghiệp phải hợp lệ cho mùa 2026." }, { status: 400 });
    }
    const rawTotal = b.rawTotal;
    const region: PriorityRegion =
      typeof b.region === "string" && ["KV1", "KV2-NT", "KV2", "KV3"].includes(b.region)
        ? (b.region as PriorityRegion)
        : "KV3";
    const group: PriorityGroup =
      typeof b.group === "string" && ["none", "UT1", "UT2"].includes(b.group)
        ? (b.group as PriorityGroup)
        : "none";
    const method = isMethodKey(b.method) ? b.method : "thpt";

    if (region !== "KV3" && b.graduationYear === undefined) {
      return NextResponse.json({ ok: false, error: "Cần năm tốt nghiệp để kiểm tra thời hạn ưu tiên khu vực." }, { status: 400 });
    }
    const admission = computeAdmissionScore(rawTotal, region, group, method, { admissionSeason: 2026, graduationYear: typeof b.graduationYear === "number" ? b.graduationYear : undefined });
    return NextResponse.json({ ok: true, admission, season: 2026, referenceOnly: true });
  }

  /**
   * Quy đổi chứng chỉ Ngoại ngữ (IELTS, TOEFL...) theo chính sách từng trường
   * Không dùng bảng toàn cục chung.
   */
  static async convertCertificate(req: Request): Promise<Response> {
    const { body, error } = await jsonBody(req, 4 * 1024);
    if (error) return error;
    const b = body ?? {};

    const certificateType: CertificateType = (b.certificateType as CertificateType) || "IELTS";
    const rawScore = b.score ?? b.ieltsScore;
    if (rawScore === undefined || rawScore === null || rawScore === "") {
      return NextResponse.json({ ok: false, error: "Thiếu điểm chứng chỉ" }, { status: 400 });
    }
    const score = typeof rawScore === "number" ? rawScore : parseFloat(String(rawScore));
    if (!Number.isFinite(score) || (typeof rawScore === "string" && !/^\d+(?:\.\d+)?$/.test(rawScore.trim()))) {
      return NextResponse.json({ ok: false, error: "Điểm chứng chỉ không hợp lệ" }, { status: 400 });
    }
    const institutionId = typeof b.institutionId === "string" ? b.institutionId.trim() : undefined;
    const programId = typeof b.programId === "string" ? b.programId.trim() : undefined;
    const season = typeof b.season === "number" ? b.season : 2026;

    if (!institutionId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cần cung cấp mã trường (institutionId) để tra cứu chính sách quy đổi. Hệ thống không áp dụng bảng quy đổi chung theo quy định bảo đảm tính pháp lý.",
        },
        { status: 400 }
      );
    }

    const result = certificatePolicyService.convertScore({
      institutionId,
      programId,
      certificateType,
      score,
      season,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: result.reason,
          convertedScore: null,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      institutionId,
      certificateType,
      score,
      convertedScore: result.convertedScore,
      explanation: result.explanation,
      policy: {
        id: result.policy.id,
        documentTitle: result.policy.documentTitle,
        officialSourceUrl: result.policy.officialSourceUrl,
        publishedAt: result.policy.publishedAt,
      },
    });
  }

  /**
   * Tính điểm tổ hợp có môn chính nhân 2
   */
  static async calculateWeightedCombo(req: Request): Promise<Response> {
    const { body, error } = await jsonBody(req, 8 * 1024);
    if (error) return error;
    const b = body ?? {};

    const scores = (b.scores && typeof b.scores === "object" ? b.scores : {}) as Record<string, number>;
    const combo = b.combo as Combo;
    const mainSubject = typeof b.mainSubject === "string" ? b.mainSubject : undefined;
    const scale = b.scale === 40 ? 40 : 30;

    if (!combo || !Array.isArray(combo.subjects) || combo.subjects.length !== 3 || combo.subjects.some(subject => typeof subject !== "string") || new Set(combo.subjects).size !== 3) {
      return NextResponse.json({ ok: false, error: "Cần đúng 3 môn khác nhau trong tổ hợp" }, { status: 400 });
    }

    const total = computeWeightedComboTotal(scores, combo, mainSubject, scale);
    if (total === null) return NextResponse.json({ ok: false, error: "Điểm từng môn hoặc môn nhân hệ số không hợp lệ" }, { status: 400 });
    return NextResponse.json({ ok: true, total, scale, mainSubject, referenceOnly: true });
  }

  /**
   * Đánh giá tiêu chí phụ (Tie-breaker)
   */
  static async evaluateTieBreaker(req: Request): Promise<Response> {
    const { body, error } = await jsonBody(req, 8 * 1024);
    if (error) return error;
    const b = body ?? {};

    const scores = (b.scores && typeof b.scores === "object" ? b.scores : {}) as Record<string, number>;
    const wishOrder = typeof b.wishOrder === "number" ? b.wishOrder : 1;
    const criteria = b.criteria ?? {};

    const result = evaluateTieBreaker(scores, wishOrder, criteria);
    return NextResponse.json({ ok: true, ...result });
  }
}
