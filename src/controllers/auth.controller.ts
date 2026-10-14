/**
 * CONTROLLER LAYER (MVC Architecture) — AuthController
 * Xử lý đăng nhập, đăng ký, phiên làm việc người dùng và bảo mật xác thực.
 */
import { NextResponse } from "next/server";
import { authService } from "../services";
import { attachSession, clearSession, getCurrentUser } from "../lib/auth";
import { clientIp, jsonBody, tooMany } from "../lib/http";
import { rateLimit } from "../lib/rate-limit";

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req: Request): Promise<Response> {
    const { body, error } = await jsonBody<{ email?: unknown; password?: unknown }>(req, 8 * 1024);
    if (error) return error;
    const email = String(body?.email ?? "").slice(0, 200);
    const password = String(body?.password ?? "").slice(0, 200);

    const wait = Math.max(
      rateLimit(`login:ip:${clientIp(req)}`, 30, 600),
      rateLimit(`login:email:${email.toLowerCase()}`, 10, 600),
    );
    if (wait) return tooMany(wait);

    const result = await authService.login(email, password);
    if (!result.ok) {
      const status = result.reason === "locked" ? 423 : result.reason === "google_only" ? 409 : 401;
      return NextResponse.json(result, { status });
    }
    return await attachSession(NextResponse.json(result), result.user.id);
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(): Promise<Response> {
    const res = NextResponse.json({ ok: true });
    return clearSession(res);
  }

  /**
   * GET /api/auth/me
   */
  static async getCurrentUser(): Promise<Response> {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  }
}
