import { NextResponse } from "next/server";
import { appOrigin, requireAdmin } from "@/lib/auth";
import { jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { userAdminService } from "@/services/user-admin.service";

/** Tạo tài khoản (gửi link đặt mật khẩu qua email). */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const wait = rateLimit(`admin-create-user:${user.id}`, 20, 3600);
  if (wait) return tooMany(wait);
  const parsed = await jsonBody<Record<string, unknown>>(req, 4096);
  if (parsed.error) return parsed.error;
  const origin = appOrigin(req);
  const res = await userAdminService.create(user, parsed.body ?? {}, (t) => `${origin}/quen-mat-khau?token=${encodeURIComponent(t)}`);
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
