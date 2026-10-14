import { NextResponse } from "next/server";
import { attachSession, requireUser } from "@/lib/auth";

/** POST /api/auth/refresh — gia hạn phiên đang còn hiệu lực (từ cảnh báo "Phiên sẽ hết hạn sau 5 phút"). */
export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;
  return await attachSession(NextResponse.json({ ok: true }), user.id);
}
