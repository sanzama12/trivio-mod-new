import { NextResponse } from "next/server";
import { authService } from "@/services";
import { appOrigin } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Gửi link đặt lại mật khẩu (qua mailer — bản demo in ra terminal).
 * Chỉ ở chế độ demo mới trả token về trình duyệt để mô phỏng "mở link trong email";
 * production thì KHÔNG trả token (nếu không, ai biết email cũng đặt lại được mật khẩu).
 */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ email?: unknown }>(req, 4 * 1024);
  if (error) return error;
  const email = String(body?.email ?? "").slice(0, 200);
  const wait = Math.max(rateLimit(`forgot:ip:${clientIp(req)}`, 10, 900), rateLimit(`forgot:email:${email.toLowerCase()}`, 3, 900));
  if (wait) return tooMany(wait);
  const origin = appOrigin(req);
  const { token } = await authService.requestPasswordReset(email, (t) => `${origin}/quen-mat-khau?token=${encodeURIComponent(t)}`);
  return NextResponse.json(isDemoMode() ? { ok: true, demo: true, token } : { ok: true, demo: false });
}
