import { NextResponse } from "next/server";
import { authService } from "@/services";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { emailError } from "@/lib/email-validation";
import { isMailerConfigured } from "@/services/mailer";

export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ email?: unknown }>(req, 4 * 1024);
  if (error) return error;
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
  if (emailError(email)) return NextResponse.json({ ok: false, message: "Email không hợp lệ." }, { status: 400 });
  const wait = Math.max(rateLimit(`forgot:ip:${clientIp(req)}`, 10, 900), rateLimit(`forgot:email:${email.toLowerCase()}`, 3, 900));
  if (wait) return tooMany(wait);
  if (!isMailerConfigured()) return NextResponse.json({ ok: false, message: "Dịch vụ gửi email chưa được cấu hình. Vui lòng thử lại sau." }, { status: 503 });
  try {
    await authService.requestPasswordResetCode(email);
    return NextResponse.json({ ok: true });
  } catch {
    console.warn("[password-reset] Không thể gửi mã khôi phục.");
    return NextResponse.json({ ok: false, message: "Chưa gửi được mã xác nhận. Vui lòng thử lại sau." }, { status: 503 });
  }
}
