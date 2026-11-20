import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { attachSession, getCurrentUser, safeNext } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { isFirebaseServerConfigured, verifyFirebaseGoogleToken } from "@/services/firebase-auth.service";

export async function POST(req: Request) {
  const wait = await rateLimit(`auth:firebase:${clientIp(req)}`, 20, 60);
  if (wait) return tooMany(wait);
  const { body, error } = await jsonBody<{ idToken?: unknown; next?: unknown; mode?: unknown }>(req, 12 * 1024);
  if (error) return error;
  if (!isFirebaseServerConfigured()) return NextResponse.json({ ok: false, message: "Đăng nhập Google chưa được cấu hình." }, { status: 503 });
  if (typeof body?.idToken !== "string" || body.idToken.length > 10000) return NextResponse.json({ ok: false, message: "Thiếu phiên đăng nhập Google." }, { status: 400 });

  const mode = body.mode === "link" ? "link" : "login";
  const next = safeNext(typeof body.next === "string" ? body.next : null, mode === "link" ? "/ho-so" : "/");
  try {
    const current = mode === "link" ? await getCurrentUser() : null;
    if (mode === "link" && !current) return NextResponse.json({ ok: false, message: "Bạn cần đăng nhập để liên kết Google." }, { status: 401 });
    const profile = await verifyFirebaseGoogleToken(body.idToken);
    const result = await authService.loginWithGoogle(profile, { linkToUserId: current?.id });
    if (!result.ok) {
      const messages: Record<string, string> = {
        email_unverified: "Email Google chưa được xác minh.",
        conflict: "Google đã liên kết với tài khoản khác.",
        not_found: "Không tìm thấy tài khoản cần liên kết.",
        disabled: "Tài khoản đã bị khóa. Hãy liên hệ quản trị viên.",
        locked: "Tài khoản tạm khóa. Hãy thử lại sau.",
      };
      return NextResponse.json({ ok: false, message: messages[result.reason] ?? "Đăng nhập thất bại." }, { status: 403 });
    }
    const redirect = mode === "link" ? "/ho-so?linked=google#dang-nhap" : result.isNew || !result.user.onboarded ? `/chao-mung?next=${encodeURIComponent(next)}` : next;
    return attachSession(NextResponse.json({ ok: true, redirect, user: result.user }), result.user.id);
  } catch (error) {
    console.warn("[firebase-auth] Không xác minh được đăng nhập Google:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, message: "Không xác minh được đăng nhập Google. Hãy thử lại." }, { status: 401 });
  }
}
