import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { readSessionToken, SESSION_COOKIE } from "@/services/session.service";

/** Người dùng hiện tại + thời điểm phiên hết hạn (để cảnh báo trước 5 phút). */
export async function GET() {
  const user = await getCurrentUser();
  const session = user ? readSessionToken((await cookies()).get(SESSION_COOKIE)?.value) : null;
  return NextResponse.json({ user, sessionExpiresAt: session ? new Date(session.exp * 1000).toISOString() : null });
}
