import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { notificationService } from "@/services/notification.service";

/** POST /api/notifications/read { ids?: string[] } — không có ids = đánh dấu tất cả. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: bodyError } = await jsonBody<{ ids?: unknown }>(req, 4 * 1024);
  if (bodyError) return bodyError;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 50) : undefined;
  const changed = await notificationService.markRead(user.id, ids);
  return NextResponse.json({ ok: true, changed });
}
