import { NextResponse } from "next/server";
import { appOrigin, requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { userAdminService } from "@/services/user-admin.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const data = await userAdminService.detail(id);
  return data ? NextResponse.json({ ok: true, ...data }) : NextResponse.json({ ok: false, message: "Không tìm thấy tài khoản." }, { status: 404 });
}

/** { action: lock | unlock | delete (confirm=email) | moderator (value) | staff-approve | staff-reject | invite } */
export async function POST(req: Request, ctx: Ctx) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;
  const parsed = await jsonBody<Record<string, unknown>>(req, 2048);
  if (parsed.error) return parsed.error;
  const origin = appOrigin(req);
  const res = await userAdminService.action(user, id, parsed.body ?? {}, (t) => `${origin}/quen-mat-khau?token=${encodeURIComponent(t)}`);
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
