import { NextResponse } from "next/server";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { analyticsService } from "@/services/analytics.service";

/** POST /api/events { event, anon } — đếm phễu hành vi ẩn danh (không lưu IP, tài khoản). */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ event?: unknown; usage?: unknown; id?: unknown; anon?: unknown }>(req, 512);
  if (error) return error;
  const wait = await rateLimit(`events:${clientIp(req)}`, 120, 600);
  if (wait) return tooMany(wait);
  const ok = body?.usage !== undefined
    ? await analyticsService.trackUsage(body.usage, body.id, body.anon)
    : await analyticsService.track(body?.event, body?.anon);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
