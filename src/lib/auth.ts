/**
 * Cầu nối presentation ↔ service cho phiên đăng nhập (chỉ chạy trên server).
 */
import { cookies } from "next/headers";
import { cache } from "react";
import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { createSessionToken, readSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, signToken, verifyToken } from "@/services/session.service";

const secure = process.env.NODE_ENV === "production";

/** Người dùng của request hiện tại — `cache` để layout gốc, header và trang dùng chung 1 lần đọc (không đọc DB nhiều lần). */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return authService.getUserForSession(session.uid, session.sv);
});

/** Dùng trong route handler: trả user hoặc response 401. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: NextResponse.json({ ok: false, message: "Bạn cần đăng nhập." }, { status: 401 }) } as const;
  return { user, error: null } as const;
}

/** Chỉ quản trị viên (401 nếu chưa đăng nhập, 403 nếu không có quyền). */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: NextResponse.json({ ok: false, message: "Bạn cần đăng nhập." }, { status: 401 }) } as const;
  if (!user.admin) return { user: null, error: NextResponse.json({ ok: false, message: "Bạn không có quyền quản trị." }, { status: 403 }) } as const;
  return { user, error: null } as const;
}

/** Quản trị viên hoặc kiểm duyệt viên (cảm nhận, hỏi đáp, báo lỗi). */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: NextResponse.json({ ok: false, message: "Bạn cần đăng nhập." }, { status: 401 }) } as const;
  if (!user.admin && !user.moderator) return { user: null, error: NextResponse.json({ ok: false, message: "Bạn không có quyền kiểm duyệt." }, { status: 403 }) } as const;
  return { user, error: null } as const;
}

/** Gắn cookie phiên (kèm phiên bản phiên hiện tại của tài khoản). */
export async function attachSession(res: NextResponse, userId: string) {
  await authService.markLogin(userId);
  const sv = await authService.getSessionVersion(userId);
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId, Date.now(), sv), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure,
  });
  return res;
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

/** Chỉ cho phép chuyển hướng nội bộ để tránh open redirect. */
export function safeNext(next: string | null | undefined, fallback = "/ho-so"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Gốc URL của ứng dụng (APP_URL khi deploy sau proxy, ngược lại lấy từ request). */
export function appOrigin(req: Request): string {
  return (process.env.APP_URL ?? new URL(req.url).origin).replace(/\/$/, "");
}

export const googleRedirectUri = (req: Request) => `${appOrigin(req)}/api/auth/google/callback`;

// ---- State cho luồng OAuth (chống CSRF), lưu trong cookie httpOnly có chữ ký, sống 10 phút ----
const OAUTH_COOKIE = "trovio_oauth";
const OAUTH_PATH = "/api/auth/google";
export type OAuthIntent = { state: string; next: string; mode: "login" | "link" };

export function attachOAuthState(res: NextResponse, intent: OAuthIntent) {
  res.cookies.set(OAUTH_COOKIE, signToken(intent, 600), { httpOnly: true, sameSite: "lax", path: OAUTH_PATH, maxAge: 600, secure });
  return res;
}

export async function readOAuthState(): Promise<OAuthIntent | null> {
  const store = await cookies();
  return verifyToken<OAuthIntent>(store.get(OAUTH_COOKIE)?.value);
}

export function clearOAuthState(res: NextResponse) {
  res.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", path: OAUTH_PATH, maxAge: 0 });
  return res;
}
