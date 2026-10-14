import { NextResponse } from "next/server";
import { authService } from "@/services";
import { requireUser } from "@/lib/auth";

/** Gỡ liên kết Google (liên kết mới: GET /api/auth/google?mode=link). */
export async function DELETE() {
  const { user, error } = await requireUser();
  if (error) return error;
  const result = await authService.unlinkGoogle(user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
