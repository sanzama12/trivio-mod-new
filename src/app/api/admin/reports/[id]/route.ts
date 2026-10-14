import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { dataReportService } from "@/services/data-report.service";

/** PATCH /api/admin/reports/[id] { status, note } — quản trị viên xử lý báo lỗi. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const { body, error: bodyError } = await jsonBody<{ status?: unknown; note?: unknown }>(req, 4 * 1024);
  if (bodyError) return bodyError;
  const { id } = await ctx.params;
  const result = await dataReportService.update(user, id, body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
