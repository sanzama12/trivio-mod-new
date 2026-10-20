/**
 * CONTROLLER LAYER (MVC Architecture) — RecommendationController
 * Tiếp nhận yêu cầu gợi ý ngành & trường học, kiểm tra tính hợp lệ của tham số,
 * điều phối Service gợi ý và trả về phản hồi chuẩn hóa.
 */
import { NextResponse } from "next/server";
import type { AdmissionMethodKey, Region } from "../models";
import {
  ADMISSION_METHODS,
  isMethodKey,
  recommendationService,
  REGION_LABELS,
  type RecommendFocus,
} from "../services";
import { getCurrentUser } from "../lib/auth";
import { jsonBody } from "../lib/http";

export class RecommendationController {
  /**
   * Xử lý yêu cầu POST /api/recommendations
   */
  static async getRecommendations(req: Request): Promise<Response> {
    const { body, error } = await jsonBody(req, 16 * 1024);
    if (error) return error;
    const b = body ?? {};

    let score: { method: AdmissionMethodKey; total: number; combo: string } | null = null;
    const s = b.score as { method?: unknown; total?: unknown; combo?: unknown } | undefined;
    if (s && isMethodKey(s.method) && typeof s.total === "number" && s.total > 0 && s.total <= ADMISSION_METHODS[s.method].max) {
      score = { method: s.method, total: s.total, combo: typeof s.combo === "string" ? s.combo.slice(0, 5) : "" };
    }
    const methodScores = Array.isArray(b.methodScores)
      ? b.methodScores
          .filter((row): row is { method: AdmissionMethodKey; total: number; combo: string } => {
            if (!row || typeof row !== "object") return false;
            const r = row as { method?: unknown; total?: unknown; combo?: unknown };
            return isMethodKey(r.method) && typeof r.total === "number" && r.total > 0 && r.total <= ADMISSION_METHODS[r.method].max;
          })
          .map((row) => ({ method: row.method, total: row.total, combo: typeof row.combo === "string" ? row.combo.slice(0, 5) : "" }))
          .slice(0, 8)
      : [];
    const comboScores = Array.isArray(b.comboScores)
      ? b.comboScores
          .filter((row): row is { code: string; total: number } => {
            if (!row || typeof row !== "object") return false;
            const r = row as { code?: unknown; total?: unknown };
            return typeof r.code === "string" && /^[A-Z]\d{2}$/.test(r.code) && typeof r.total === "number" && r.total > 0 && r.total <= 30;
          })
          .map((row) => ({ code: row.code, total: row.total }))
          .slice(0, 20)
      : [];
    const budgetMax = typeof b.budgetMax === "number" && b.budgetMax > 0 && b.budgetMax < 10_000 ? b.budgetMax : null;
    const regions = Array.isArray(b.regions) ? (b.regions.filter((r) => typeof r === "string" && r in REGION_LABELS) as Region[]) : [];
    const groupIds = Array.isArray(b.groupIds) ? b.groupIds.filter((g): g is string => typeof g === "string").slice(0, 20) : [];
    const interestMajorIds = Array.isArray(b.interestMajorIds) ? b.interestMajorIds.filter((g): g is string => typeof g === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(g)).slice(0, 20) : [];

    const goalMajorId = typeof b.goalMajorId === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(b.goalMajorId) ? b.goalMajorId : null;
    const focus = typeof b.focus === "string" && ["balanced", "passion", "admission", "location_budget"].includes(b.focus) ? (b.focus as RecommendFocus) : undefined;
    const limit = typeof b.limit === "number" && Number.isInteger(b.limit) ? Math.min(12, Math.max(1, b.limit)) : 6;

    const user = await getCurrentUser();
    const result = await recommendationService.recommend(
      {
        score: score ?? methodScores[0] ?? null,
        methodScores: methodScores.length ? methodScores : undefined,
        comboScores: comboScores.length ? comboScores : undefined,
        budgetMax,
        regions,
        groupIds,
        interestMajorIds: interestMajorIds.length ? interestMajorIds : undefined,
        province: user?.province ?? null,
        goalMajorId,
        focus,
      },
      limit,
    );

    return NextResponse.json({ ...result, province: user?.province ?? null });
  }
}
