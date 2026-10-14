import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { catalogAdminService } from "@/services/catalog-admin.service";

/**
 * Quản trị danh mục (A02–A04).
 * { entity: "school" | "major" | "program", action: "save" | "hide" | "show", id?, data? }
 */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const parsed = await jsonBody<{ entity?: unknown; action?: unknown; id?: unknown; data?: Record<string, unknown> }>(req, 16 * 1024);
  if (parsed.error) return parsed.error;
  const { entity, action, id, data } = parsed.body ?? {};
  const sid = typeof id === "string" ? id : "";
  let res: { ok: boolean; status?: number } & Record<string, unknown>;
  if (action === "hide" || action === "show") {
    const hidden = action === "hide";
    if (entity === "school") res = await catalogAdminService.setSchoolHidden(user, sid, hidden);
    else if (entity === "major") res = await catalogAdminService.setMajorHidden(user, sid, hidden);
    else if (entity === "program") res = await catalogAdminService.setProgramHidden(user, sid, hidden);
    else return NextResponse.json({ ok: false, message: "Đối tượng không hợp lệ." }, { status: 400 });
  } else if (action === "save") {
    const input = data && typeof data === "object" ? data : {};
    if (entity === "school") res = await catalogAdminService.saveSchool(user, input);
    else if (entity === "major") res = await catalogAdminService.saveMajor(user, input);
    else if (entity === "program") res = await catalogAdminService.createProgram(user, input);
    else return NextResponse.json({ ok: false, message: "Đối tượng không hợp lệ." }, { status: 400 });
  } else return NextResponse.json({ ok: false, message: "Thao tác không hợp lệ." }, { status: 400 });
  return NextResponse.json(res, { status: res.ok ? 200 : (res.status ?? 400) });
}
