import { NextResponse } from "next/server";
import { authService } from "@/services";
import { attachSession } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ email?: unknown; code?: unknown }>(req, 4 * 1024);
  if (error) return error;
  const email = String(body?.email ?? "").slice(0, 200);
  const code = String(body?.code ?? "").slice(0, 12);
  // Mã 6 số → phải giới hạn số lần thử để không dò được.
  const wait = Math.max(rateLimit(`otp:ip:${clientIp(req)}`, 20, 600), rateLimit(`otp:email:${email.toLowerCase()}`, 8, 600));
  if (wait) return tooMany(wait);
  const result = await authService.verifyEmail(email, code);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return await attachSession(NextResponse.json(result), result.user.id);
}
