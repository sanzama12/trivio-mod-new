import { NextResponse } from "next/server";
import { authService } from "@/services";
import { attachSession, requireUser } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

/** Đổi mật khẩu (cần mật khẩu hiện tại) hoặc tạo mật khẩu lần đầu cho tài khoản Google. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const parsed = await jsonBody(req, 8 * 1024);
  if (parsed.error) return parsed.error;
  const body = parsed.body ?? {};
  const result = await authService.setPassword(user.id, {
    current: typeof body.current === "string" ? body.current : undefined,
    password: String(body.password ?? "").slice(0, 200),
    confirm: String(body.confirm ?? "").slice(0, 200),
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  // Đổi mật khẩu thu hồi mọi phiên cũ → cấp lại phiên cho thiết bị đang dùng.
  return await attachSession(NextResponse.json(result), user.id);
}
