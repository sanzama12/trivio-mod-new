import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { notificationService } from "@/services/notification.service";

/** GET /api/notifications — 20 thông báo mới nhất của người đang đăng nhập. */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const data = await notificationService.list(user.id, 20);
  return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "private, no-store" } });
}
