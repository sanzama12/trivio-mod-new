import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, jsonBody, tooMany } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { dataReportService } from "@/services/data-report.service";

/** POST /api/reports — gửi báo dữ liệu sai (không cần đăng nhập; có bẫy bot + giới hạn tần suất). */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<Record<string, unknown>>(req, 8 * 1024);
  if (error) return error;
  const user = await getCurrentUser();
  const wait = Math.max(rateLimit(`report-data:${clientIp(req)}`, 5, 3600), user ? rateLimit(`report-data:u:${user.id}`, 10, 3600) : 0);
  if (wait) return tooMany(wait);
  // Bẫy bot: ô ẩn "website" phải để trống. Trả 200 để bot không biết đã bị lọc.
  if (typeof body?.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });
  const result = await dataReportService.submit(body ?? {}, user);
  return NextResponse.json(result, { status: result.ok ? 201 : result.status });
}
