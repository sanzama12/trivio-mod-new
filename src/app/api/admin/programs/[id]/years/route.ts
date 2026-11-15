import { NextResponse } from "next/server";
import { programYearService } from "@/services";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Dữ liệu tuyển sinh theo năm của một chương trình (chỉ quản trị viên). */
export async function GET(_req: Request, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  return NextResponse.json({ ok: true, rows: await programYearService.list(id) });
}

/** PUT { rows: [{ year, tuitionMin, tuitionMax, quota, status, note }] } — lưu cả các năm không đổi. */
export async function PUT(req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await jsonBody<{ rows?: unknown }>(req, 16 * 1024);
  if (parsed.error) return parsed.error;
  const result = await programYearService.save(user, id, parsed.body?.rows);
  return NextResponse.json(result, { status: result.ok ? 200 : result.field === "id" ? 404 : 400 });
}
