import { NextResponse } from "next/server";
import { adminService, type ProgramEditInput } from "@/services";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Sửa dữ liệu chương trình (chỉ quản trị viên). */
export async function PATCH(req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await jsonBody<ProgramEditInput>(req, 16 * 1024);
  if (parsed.error) return parsed.error;
  const result = await adminService.updateProgram(user, id, parsed.body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : result.field === "id" ? 404 : 400 });
}

/** { action: "verify" } — đánh dấu đã kiểm tra với nguồn; { action: "school-verify", verified, note } — huy hiệu "Trường đã xác nhận". */
export async function POST(req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await jsonBody<{ action?: unknown; verified?: unknown; note?: unknown }>(req, 2048);
  if (parsed.error) return parsed.error;
  if (parsed.body?.action === "school-verify") {
    const res = await adminService.setSchoolVerified(user, id, parsed.body.verified === true, parsed.body.note);
    return NextResponse.json(res, { status: res.ok ? 200 : res.field === "id" ? 404 : 400 });
  }
  if (parsed.body?.action !== "verify") return NextResponse.json({ ok: false, message: "Thao tác không hợp lệ." }, { status: 400 });
  const ok = await adminService.markVerified(user, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}

/** Khôi phục dữ liệu gốc. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const ok = await adminService.reset(user, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
