import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { schoolPortalService } from "@/services/school-portal.service";

type Ctx = { params: Promise<{ id: string }> };

/** Duyệt / từ chối bản sửa số liệu do trường gửi. { action: "approve" | "reject", note } */
export async function POST(req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await jsonBody<Record<string, unknown>>(req, 2048);
  if (parsed.error) return parsed.error;
  const res = await schoolPortalService.resolve(user, id, parsed.body ?? {});
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
