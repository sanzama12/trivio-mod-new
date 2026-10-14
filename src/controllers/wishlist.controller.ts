/**
 * CONTROLLER LAYER (MVC Architecture) — WishlistController
 * Tiếp nhận và xử lý đánh giá chiến lược danh sách nguyện vọng,
 * kiểm tra thứ tự từ khó đến dễ, tỷ lệ vàng và mô phỏng thay đổi điểm số.
 */
import { NextResponse } from "next/server";
import { analyzeWishlist, simulateDelta, type StrategyItem } from "../services/wishlist-strategy";
import type { ScoreProfile, AdmissionScore } from "../models";
import { jsonBody } from "../lib/http";

type ProfileLike = Pick<ScoreProfile, "method" | "combo" | "priorityRegion" | "priorityGroup" | "budgetMax"> & {
  admission: Pick<AdmissionScore, "rawTotal">;
};

export class WishlistController {
  /**
   * Đánh giá chiến lược danh sách nguyện vọng
   */
  static async analyzeStrategy(req: Request): Promise<Response> {
    const { body, error } = await jsonBody<{ items: StrategyItem[]; profile: ProfileLike | null; delta?: number }>(
      req,
      32 * 1024,
    );
    if (error) return error;

    const items = Array.isArray(body?.items) ? body!.items : [];
    const profile = body?.profile ?? null;
    const delta = typeof body?.delta === "number" ? body.delta : 0;

    const report = analyzeWishlist(items, profile, delta);
    return NextResponse.json({ ok: true, report });
  }

  /**
   * Mô phỏng sự thay đổi mức an toàn khi điểm biến động delta
   */
  static async simulateScoreDelta(req: Request): Promise<Response> {
    const { body, error } = await jsonBody<{ items: StrategyItem[]; profile: ProfileLike; delta: number }>(
      req,
      32 * 1024,
    );
    if (error) return error;

    if (!body?.profile || typeof body.delta !== "number") {
      return NextResponse.json({ ok: false, error: "Hồ sơ hoặc mức thay đổi điểm không hợp lệ" }, { status: 400 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const simulation = simulateDelta(items, body.profile, body.delta);
    return NextResponse.json({ ok: true, simulation });
  }
}
