import { NextResponse } from "next/server";
import { interestService } from "@/services";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";

/**
 * POST { action, … } — quản lý dữ liệu gợi ý ngành (chỉ quản trị viên):
 *  - interest-save { id?, name, kind, description, hidden, position, majorIds }
 *  - interest-delete { id }
 *  - subject-links { subjectId, majorIds }
 *  - career-save { majorId, knowledge, careerOrientation, careers }
 */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const parsed = await jsonBody<Record<string, unknown>>(req, 32 * 1024);
  if (parsed.error) return parsed.error;
  const body = parsed.body ?? {};
  switch (body.action) {
    case "interest-save": {
      const res = await interestService.save(user, body);
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }
    case "interest-delete": {
      const ok = typeof body.id === "string" && (await interestService.remove(user, body.id));
      return NextResponse.json({ ok, message: ok ? undefined : "Không tìm thấy mục cần xoá." }, { status: ok ? 200 : 404 });
    }
    case "subject-links": {
      const res = await interestService.saveSubjectLinks(user, body.subjectId, body.majorIds);
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }
    case "career-save": {
      const res = await interestService.saveCareerInfo(user, body.majorId, body);
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }
    default:
      return NextResponse.json({ ok: false, message: "Thao tác không hợp lệ." }, { status: 400 });
  }
}
