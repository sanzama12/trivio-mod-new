import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { qaService } from "@/services/community.service";

/** GET /api/admin/qa — câu hỏi / câu trả lời chờ duyệt. POST — duyệt hoặc từ chối. */
export async function GET() {
  const { error } = await requireStaff();
  if (error) return error;
  return NextResponse.json({ ok: true, items: await qaService.pending() });
}

export async function POST(req: Request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const { body, error: tooBig } = await jsonBody(req, 2 * 1024);
  if (tooBig) return tooBig;
  const res = await qaService.moderate(user, body ?? {});
  return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
}
