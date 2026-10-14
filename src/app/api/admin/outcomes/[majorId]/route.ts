import { NextResponse } from "next/server";
import { outcomeService } from "@/services/outcome.service";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

type Ctx = { params: Promise<{ majorId: string }> };

/** Cập nhật số liệu việc làm của một ngành (mỗi con số bắt buộc có nguồn). */
export async function PATCH(req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { majorId } = await ctx.params;
  const parsed = await jsonBody(req, 8 * 1024);
  if (parsed.error) return parsed.error;
  const result = await outcomeService.updateMajor(user, majorId, parsed.body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : result.field === "majorId" ? 404 : 400 });
}

/** Khôi phục số liệu gốc. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { majorId } = await ctx.params;
  const ok = await outcomeService.resetMajor(user, majorId);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
