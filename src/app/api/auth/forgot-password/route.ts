import { NextResponse } from "next/server";
import { authService } from "@/services";
import { appOrigin } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Gửi email đặt lại mật khẩu qua Firebase Identity Toolkit REST API
 */
async function sendFirebaseResetEmail(email: string, apiKey: string, continueUrl?: string): Promise<boolean> {
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
    const body: { requestType: string; email: string; continueUrl?: string } = {
      requestType: "PASSWORD_RESET",
      email: email.trim().toLowerCase(),
    };
    if (continueUrl) {
      body.continueUrl = continueUrl;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      console.info(`[firebase:password-reset] Đã gửi email đặt lại mật khẩu tới ${email}`);
      return true;
    }

    const err = await res.json().catch(() => ({}));
    console.warn(`[firebase:password-reset] Phản hồi từ Firebase (${res.status}):`, err);
    return false;
  } catch (err) {
    console.error("[firebase:password-reset] Không thể kết nối Firebase REST API:", err);
    return false;
  }
}

/**
 * Gửi link đặt lại mật khẩu (ưu tiên gửi qua Firebase Auth nếu có API key, kết hợp Resend / local mailer).
 */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ email?: unknown }>(req, 4 * 1024);
  if (error) return error;
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);

  const wait = Math.max(
    rateLimit(`forgot:ip:${clientIp(req)}`, 10, 900),
    rateLimit(`forgot:email:${email}`, 3, 900)
  );
  if (wait) return tooMany(wait);

  const origin = appOrigin(req);
  const firebaseApiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

  let firebaseSent = false;
  if (firebaseApiKey) {
    const continueUrl = `${origin}/dang-nhap?reset=success`;
    firebaseSent = await sendFirebaseResetEmail(email, firebaseApiKey, continueUrl);
  }

  // Luôn kích hoạt quy trình Trovio token dự phòng (gửi qua Resend hoặc in terminal log)
  const { token } = await authService.requestPasswordReset(
    email,
    (t) => `${origin}/quen-mat-khau?token=${encodeURIComponent(t)}`
  );

  return NextResponse.json({
    ok: true,
    firebaseSent,
    demo: isDemoMode(),
    token: isDemoMode() ? token : undefined,
  });
}
