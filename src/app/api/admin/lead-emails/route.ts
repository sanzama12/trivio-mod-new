import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { leadEmailService } from "@/services/lead-email.service";

/** POST /api/admin/lead-emails — gửi tối đa 20 email/lần tới người nhận đã đồng ý. */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const wait = rateLimit(`admin-lead-email:${user.id}`, 5, 3600);
  if (wait) return tooMany(wait);
  const parsed = await jsonBody<Record<string, unknown>>(req, 64 * 1024);
  if (parsed.error) return parsed.error;
  const result = await leadEmailService.send(user, parsed.body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
