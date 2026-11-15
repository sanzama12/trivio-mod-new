import { NextResponse } from "next/server";
import { aiSourceService } from "@/services";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

/** POST { action: "save", id?, title, kind, keywords, content, url, enabled } | { action: "delete", id } — chỉ quản trị viên. */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const parsed = await jsonBody<Record<string, unknown>>(req, 8 * 1024);
  if (parsed.error) return parsed.error;
  const body = parsed.body ?? {};
  if (body.action === "save") {
    const res = await aiSourceService.save(user, body);
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  }
  if (body.action === "delete") {
    const ok = typeof body.id === "string" && (await aiSourceService.remove(user, body.id));
    return NextResponse.json({ ok, message: ok ? undefined : "Không tìm thấy nguồn cần xoá." }, { status: ok ? 200 : 404 });
  }
  return NextResponse.json({ ok: false, message: "Thao tác không hợp lệ." }, { status: 400 });
}
