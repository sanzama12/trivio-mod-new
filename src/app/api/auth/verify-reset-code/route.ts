import { NextResponse } from "next/server";
import { authService } from "@/services";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ email?: unknown; code?: unknown }>(req, 4 * 1024);
  if (error) return error;
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
  const code = String(body?.code ?? "").slice(0, 12);
  const wait = Math.max(...await Promise.all([rateLimit(`reset-code:ip:${clientIp(req)}`, 20, 900), rateLimit(`reset-code:email:${email}`, 8, 900)]));
  if (wait) return tooMany(wait);
  const result = await authService.verifyPasswordResetCode(email, code);
  return NextResponse.json(result.ok ? result : { ok: false, message: "Mã không đúng, đã hết hạn hoặc vượt số lần thử. Hãy yêu cầu mã mới." }, {
    status: result.ok ? 200 : 400,
    headers: { "Cache-Control": "private, no-store" },
  });
}
