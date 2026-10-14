import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { timelineService } from "@/services/timeline.service";

/** PUT /api/admin/timeline — lưu lịch tuyển sinh; DELETE — quay về lịch minh hoạ gốc. */
export async function PUT(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { body, error: bodyError } = await jsonBody<Record<string, unknown>>(req, 64 * 1024);
  if (bodyError) return bodyError;
  const result = await timelineService.save(user, body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE() {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const ok = await timelineService.reset(user);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
