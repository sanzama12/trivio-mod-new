/**
 * CONTROLLER LAYER — DecisionController
 * GET /api/decision?ids=a,b,c — dữ liệu ma trận quyết định, rate-limit 60/phút
 */
import { NextResponse } from "next/server";
import { decisionDataService } from "@/services/decision-data.service";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { regionOfProvince } from "@/domain/provinces";

const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
const MAX = 6;

export class DecisionController {
  static async getDecisionRows(req: Request): Promise<Response> {
    const wait = rateLimit(`decision:${clientIp(req)}`, 60, 60);
    if (wait) return tooMany(wait);
    const ids = (new URL(req.url).searchParams.get("ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ID_RE.test(s))
      .slice(0, MAX);
    const user = await getCurrentUser();
    const homeRegion = regionOfProvince(user?.province ?? null);
    if (!ids.length) return NextResponse.json({ rows: [], homeRegion });
    const rows = await decisionDataService.getRows(ids);
    return NextResponse.json({ rows, homeRegion });
  }
}
