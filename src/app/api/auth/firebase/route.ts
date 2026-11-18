import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services";
import { attachSession, getCurrentUser, safeNext } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

interface FirebaseTokenInfo {
  iss?: string;
  aud?: string;
  sub?: string;
  user_id?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  error_description?: string;
  error?: string;
}

/**
 * Xác thực Firebase / Google ID token trực tiếp qua Google OAuth2 API
 */
async function verifyFirebaseToken(idToken: string): Promise<FirebaseTokenInfo> {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Token không hợp lệ hoặc đã hết hạn (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as FirebaseTokenInfo;
}

/**
 * POST /api/auth/firebase
 * Đăng nhập hoặc liên kết tài khoản bằng Google qua Firebase Auth
 */
export async function POST(req: NextRequest) {
  // Rate limit theo IP để chống spam brute force
  const ip = clientIp(req);
  const wait = rateLimit(`auth:firebase:${ip}`, 30, 60);
  if (wait) return tooMany(wait);

  const { body, error } = await jsonBody<{
    idToken?: string;
    next?: string;
    mode?: "login" | "link";
  }>(req, 32 * 1024);

  if (error) return error;

  const idToken = body?.idToken?.trim();
  if (!idToken) {
    return NextResponse.json({ ok: false, error: "Thiếu idToken từ Firebase" }, { status: 400 });
  }

  const mode = body?.mode === "link" ? "link" : "login";
  const next = safeNext(body?.next, mode === "link" ? "/ho-so" : "/");

  try {
    const tokenInfo = await verifyFirebaseToken(idToken);

    // Xác thực project ID nếu có cấu hình
    const expectedProject =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (expectedProject) {
      const aud = tokenInfo.aud;
      const iss = tokenInfo.iss || "";
      const matchesAud = aud === expectedProject;
      const matchesIss = iss.includes(expectedProject);
      if (!matchesAud && !matchesIss) {
        console.warn(`[firebase-auth] Token audience mismatch: aud=${aud}, iss=${iss}, expected=${expectedProject}`);
      }
    }

    const sub = tokenInfo.sub || tokenInfo.user_id;
    const email = tokenInfo.email?.toLowerCase().trim();
    const emailVerified =
      tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

    if (!sub || !email) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy thông tin email hoặc định danh người dùng từ Google" },
        { status: 400 }
      );
    }

    if (!emailVerified) {
      return NextResponse.json(
        { ok: false, error: "Email Google chưa được xác minh" },
        { status: 403 }
      );
    }

    const current = mode === "link" ? await getCurrentUser() : null;
    if (mode === "link" && !current) {
      return NextResponse.json(
        { ok: false, error: "Bạn cần đăng nhập trước khi liên kết tài khoản" },
        { status: 401 }
      );
    }

    const result = await authService.loginWithGoogle(
      {
        sub,
        email,
        emailVerified,
        name: tokenInfo.name || email.split("@")[0],
        picture: tokenInfo.picture || null,
      },
      { linkToUserId: current?.id }
    );

    if (!result.ok) {
      const reasonMap: Record<string, string> = {
        email_unverified: "Email chưa được xác thực bởi Google.",
        conflict: "Tài khoản Google này đã được liên kết với người dùng khác.",
        not_found: "Không tìm thấy người dùng để liên kết.",
        disabled: "Tài khoản này đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.",
      };
      return NextResponse.json(
        { ok: false, error: reasonMap[result.reason] || "Đăng nhập thất bại" },
        { status: 400 }
      );
    }

    const dest =
      mode === "link"
        ? "/ho-so?linked=google#dang-nhap"
        : result.isNew || !result.user.onboarded
          ? `/chao-mung?next=${encodeURIComponent(next)}`
          : next;

    const res = NextResponse.json({
      ok: true,
      user: result.user,
      isNew: result.isNew,
      redirect: dest,
    });

    return await attachSession(res, result.user.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Đăng nhập với Firebase thất bại";
    console.error("[firebase-auth] Lỗi xác thực:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
