import { NextResponse } from "next/server";
import { reviewService } from "@/services/review.service";
import { requireStaff } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

/** Duyệt / từ chối cảm nhận: { action: "approve" | "reject", reason? } */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const parsed = await jsonBody<{ action?: unknown; reason?: unknown }>(req, 2 * 1024);
  if (parsed.error) return parsed.error;
  const { id } = await ctx.params;
  const result = await reviewService.moderate(user, id, parsed.body?.action, parsed.body?.reason);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
