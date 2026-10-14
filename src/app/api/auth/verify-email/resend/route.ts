import { NextResponse } from "next/server";
import { authService } from "@/services";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/** Gửi lại mã xác thực email. Luôn trả ok để không lộ email nào đã đăng ký. */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ email?: unknown }>(req, 4 * 1024);
  if (error) return error;
  const email = String(body?.email ?? "").slice(0, 200);
  const wait = Math.max(rateLimit(`otp-resend:ip:${clientIp(req)}`, 5, 600), rateLimit(`otp-resend:email:${email.toLowerCase()}`, 3, 600));
  if (wait) return tooMany(wait);
  return NextResponse.json(await authService.resendEmailOtp(email));
}
