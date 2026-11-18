import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services";
import { attachSession, getCurrentUser, safeNext } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

interface FirebaseUserRecord {
  localId: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: Array<{
    providerId: string;
    rawId?: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
  }>;
}

interface FirebaseLookupResponse {
  users?: FirebaseUserRecord[];
  error?: {
    code: number;
    message: string;
  };
}

interface JwtPayload {
  iss?: string;
  aud?: string;
  sub?: string;
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  exp?: number;
  auth_time?: number;
}

/**
 * Giải mã phần payload của JWT an toàn
 */
function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Cấu trúc ID token không đúng định dạng JWT");
  }
  const payloadStr = Buffer.from(parts[1], "base64url").toString("utf-8");
  return JSON.parse(payloadStr) as JwtPayload;
}

/**
 * Xác thực Firebase ID Token:
 * 1. Gọi Google Identity Toolkit REST API (accounts:lookup) để Google xác minh chữ ký và token.
 * 2. Kết hợp giải mã JWT payload để đảm bảo an toàn tối đa.
 */
async function verifyFirebaseIdToken(idToken: string, apiKey: string): Promise<{
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}> {
  // Giải mã payload để kiểm tra cơ bản
  const payload = decodeJwtPayload(idToken);

  // Kiểm tra thời gian hết hạn
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error("Phiên đăng nhập Google đã hết hạn. Vui lòng bấm đăng nhập lại.");
  }

  // Gọi Google Identity Toolkit API để kiểm tra chữ ký mật mã
  const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const response = await fetch(lookupUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const errData = (await response.json().catch(() => ({}))) as FirebaseLookupResponse;
    const msg = errData?.error?.message || `Lỗi HTTP ${response.status}`;
    throw new Error(`Xác thực token thất bại từ Google: ${msg}`);
  }

  const data = (await response.json()) as FirebaseLookupResponse;
  const user = data.users?.[0];

  if (!user) {
    throw new Error("Không tìm thấy thông tin tài khoản từ Firebase");
  }

  const googleProvider = user.providerUserInfo?.find((p) => p.providerId === "google.com");

  // sub: Ưu tiên rawId từ Google provider, sau đó đến localId / sub
  const sub = googleProvider?.rawId || user.localId || payload.sub || payload.user_id;
  const email = (user.email || payload.email || "").toLowerCase().trim();
  const emailVerified = user.emailVerified === true || payload.email_verified === true;
  const name = user.displayName || payload.name || email.split("@")[0] || "Người dùng";
  const picture = user.photoUrl || payload.picture || null;

  if (!sub || !email) {
    throw new Error("Thiếu thông tin định danh người dùng hoặc email từ Google");
  }

  return { sub, email, emailVerified, name, picture };
}

/**
 * POST /api/auth/firebase
 * Đăng nhập hoặc liên kết tài khoản bằng Google qua Firebase Auth
 */
export async function POST(req: NextRequest) {
  // Rate limit theo IP để chống brute force
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

  const firebaseApiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

  if (!firebaseApiKey) {
    return NextResponse.json(
      { ok: false, error: "Máy chủ chưa cấu hình NEXT_PUBLIC_FIREBASE_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const verified = await verifyFirebaseIdToken(idToken, firebaseApiKey);

    if (!verified.emailVerified) {
      return NextResponse.json(
        { ok: false, error: "Email Google của bạn chưa được xác minh." },
        { status: 403 }
      );
    }

    const current = mode === "link" ? await getCurrentUser() : null;
    if (mode === "link" && !current) {
      return NextResponse.json(
        { ok: false, error: "Bạn cần đăng nhập trước khi liên kết tài khoản." },
        { status: 401 }
      );
    }

    const result = await authService.loginWithGoogle(
      {
        sub: verified.sub,
        email: verified.email,
        emailVerified: verified.emailVerified,
        name: verified.name,
        picture: verified.picture,
      },
      { linkToUserId: current?.id }
    );

    if (!result.ok) {
      const reasonMap: Record<string, string> = {
        email_unverified: "Email chưa được xác thực bởi Google.",
        conflict: "Tài khoản Google này đã được liên kết với một tài khoản Trovio khác.",
        not_found: "Không tìm thấy người dùng để liên kết.",
        disabled: "Tài khoản này đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.",
      };
      return NextResponse.json(
        { ok: false, error: reasonMap[result.reason] || "Đăng nhập thất bại." },
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
    const message = err instanceof Error ? err.message : "Đăng nhập Google thất bại.";
    console.error("[firebase-auth] Xác thực lỗi:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
