import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { clientIp, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { supplementaryService } from "@/services/supplementary.service";
import { jsonBody } from "@/lib/http";
import { isDemoMode } from "@/lib/env";

/** POST /api/supplementary/check — tạo thông báo cho đợt bổ sung đang mở, phù hợp điểm & nguyện vọng của tài khoản. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const wait = rateLimit(`bs-check:${user.id}:${clientIp(req)}`, 10, 600);
  if (wait) return tooMany(wait);
  const { body } = await jsonBody<{ today?: unknown }>(req, 1024);
  // Chế độ demo: cho phép mô phỏng ngày giữa mùa công bố để trình bày. Production luôn dùng ngày thật.
  const today = isDemoMode() && typeof body?.today === "string" && /^20\d{2}-\d{2}-\d{2}$/.test(body.today) ? body.today : undefined;
  const created = await supplementaryService.notifyUser(user.id, today);
  return NextResponse.json({ ok: true, created });
}
