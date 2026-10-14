import { NextResponse } from "next/server";
import { authService } from "@/services";
import { attachSession, requireUser } from "@/lib/auth";

/** Đăng xuất khỏi mọi thiết bị khác (thiết bị hiện tại nhận cookie phiên mới). */
export async function DELETE() {
  const { user, error } = await requireUser();
  if (error) return error;
  await authService.revokeSessions(user.id);
  return await attachSession(NextResponse.json({ ok: true }), user.id);
}
