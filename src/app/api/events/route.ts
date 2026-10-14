import { NextResponse } from "next/server";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { analyticsService } from "@/services/analytics.service";

/** POST /api/events { event, anon } — đếm phễu hành vi ẩn danh (không lưu IP, tài khoản). */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ event?: unknown; anon?: unknown }>(req, 512);
  if (error) return error;
  const wait = rateLimit(`events:${clientIp(req)}`, 120, 600);
  if (wait) return tooMany(wait);
  const ok = await analyticsService.track(body?.event, body?.anon);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
