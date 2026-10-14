import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { classService } from "@/services/class.service";

/** POST /api/classes/:id/remind — giáo viên nhắc cả lớp, hoặc { memberKey } để nhắc riêng một học sinh. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: tooBig } = await jsonBody(req, 2 * 1024);
  if (tooBig) return tooBig;
  const { id } = await params;
  const res = body?.memberKey ? await classService.remindMember(user, id.slice(0, 80), body) : await classService.remind(user, id.slice(0, 80), body ?? {});
  return res.ok ? NextResponse.json(res) : NextResponse.json(res, { status: res.status });
}
