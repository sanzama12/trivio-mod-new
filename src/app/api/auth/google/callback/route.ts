import { NextResponse, type NextRequest } from "next/server";
import { authService, fetchGoogleProfile } from "@/services";
import { appOrigin, attachSession, clearOAuthState, getCurrentUser, googleRedirectUri, readOAuthState } from "@/lib/auth";

/** Google chuyển hướng về đây với ?code&state (hoặc ?error nếu người dùng huỷ). */
export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const params = req.nextUrl.searchParams;
  const intent = await readOAuthState();

  const fail = (code: string) => {
    const path =
      intent?.mode === "link"
        ? `/ho-so?error=${code}#dang-nhap`
        : `/dang-nhap?error=${code}${intent ? `&next=${encodeURIComponent(intent.next)}` : ""}`;
    return clearOAuthState(NextResponse.redirect(new URL(path, origin)));
  };

  if (params.get("error")) return fail("google_cancelled");
  const code = params.get("code");
  if (!intent || !code || params.get("state") !== intent.state) return fail("google_state");

  let profile;
  try {
    profile = await fetchGoogleProfile(code, googleRedirectUri(req));
  } catch (e) {
    console.error("[google-oauth]", e);
    return fail("google_failed");
  }

  const current = intent.mode === "link" ? await getCurrentUser() : null;
  if (intent.mode === "link" && !current) return fail("google_state");

  const result = await authService.loginWithGoogle(profile, { linkToUserId: current?.id });
  if (!result.ok) return fail(`google_${result.reason}`);

  const dest =
    intent.mode === "link"
      ? "/ho-so?linked=google#dang-nhap"
      : result.isNew || !result.user.onboarded
        ? `/chao-mung?next=${encodeURIComponent(intent.next)}`
        : intent.next;
  const res = NextResponse.redirect(new URL(dest, origin));
  clearOAuthState(res);
  return await attachSession(res, result.user.id);
}
