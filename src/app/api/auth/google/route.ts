import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl, isGoogleConfigured } from "@/services";
import { appOrigin, attachOAuthState, getCurrentUser, googleRedirectUri, safeNext } from "@/lib/auth";

/** Bắt đầu đăng nhập Google: GET /api/auth/google?next=/da-luu  (mode=link để liên kết từ trang hồ sơ). */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const mode = req.nextUrl.searchParams.get("mode") === "link" ? "link" : "login";
  const next = safeNext(req.nextUrl.searchParams.get("next"), mode === "link" ? "/ho-so" : "/");

  if (!isGoogleConfigured()) {
    const back = mode === "link" ? `/ho-so?error=google_unconfigured` : `/dang-nhap?error=google_unconfigured&next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(new URL(back, origin));
  }
  if (mode === "link" && !(await getCurrentUser())) {
    return NextResponse.redirect(new URL(`/dang-nhap?next=${encodeURIComponent("/ho-so")}`, origin));
  }

  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(buildGoogleAuthUrl({ redirectUri: googleRedirectUri(req), state }));
  return attachOAuthState(res, { state, next, mode });
}
