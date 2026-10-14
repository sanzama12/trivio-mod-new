/**
 * SERVICE LAYER — Google OAuth 2.0 / OpenID Connect (authorization code flow), không dùng thư viện ngoài.
 * Tài liệu: https://developers.google.com/identity/openid-connect/openid-connect
 *
 * Biến môi trường: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 * Chỉ xin quyền tối thiểu: openid email profile (tên, email, ảnh đại diện).
 */
import type { GoogleProfile } from "./auth.service";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const googleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
});

export const isGoogleConfigured = () => {
  const { clientId, clientSecret } = googleConfig();
  return !!clientId && !!clientSecret;
};

export function buildGoogleAuthUrl(opts: { redirectUri: string; state: string; loginHint?: string }): string {
  const params = new URLSearchParams({
    client_id: googleConfig().clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    prompt: "select_account",
    include_granted_scopes: "true",
  });
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  return `${AUTH_URL}?${params}`;
}

export class GoogleOAuthError extends Error {}

/** Đổi `code` lấy access token rồi đọc thông tin người dùng. */
export async function fetchGoogleProfile(code: string, redirectUri: string, fetchImpl: typeof fetch = fetch): Promise<GoogleProfile> {
  const { clientId, clientSecret } = googleConfig();
  const tokenRes = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new GoogleOAuthError(`Token endpoint ${tokenRes.status}: ${await tokenRes.text()}`);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new GoogleOAuthError("Thiếu access_token");

  const infoRes = await fetchImpl(USERINFO_URL, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
  if (!infoRes.ok) throw new GoogleOAuthError(`Userinfo ${infoRes.status}`);
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean | string; name?: string; picture?: string };
  if (!info.sub || !info.email) throw new GoogleOAuthError("Thiếu sub/email");
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified === true || info.email_verified === "true",
    name: info.name ?? "",
    picture: info.picture ?? null,
  };
}
